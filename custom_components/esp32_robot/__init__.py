"""The ESP32 Robot integration."""
import logging
import hashlib
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
import asyncio
import voluptuous as vol
import homeassistant.helpers.config_validation as cv
from homeassistant.exceptions import ConfigEntryNotReady

from .const import DOMAIN, CONF_IP_ADDRESS, CONF_HOST, CONF_USERNAME, CONF_PASSWORD, PROXY_VIEW, DATA_CLIENT, DATA_ENTITIES, PROXY_URL, DIRECT_PROXY_URL
from .card import async_setup_card
from .frontend import async_setup_frontend
from .proxy import async_setup_proxy

# Если есть проблемы с импортом из .controller, используем временный класс-заглушку
try:
    from .controller.robot_client import ESP32RobotClient
except ImportError:
    _LOGGER = logging.getLogger(__name__)
    _LOGGER.warning("Using fallback ESP32RobotClient implementation")
    
    class ESP32RobotClient:
        """Fallback implementation of the ESP32 Robot client."""
        
        def __init__(self, host, username=None, password=None):
            """Initialize the client."""
            self.host = host
            self.username = username
            self.password = password
            self.session = None
            
        async def get_status(self, hass=None):
            """Get robot status."""
            return {"status": "unknown", "error": "Using fallback implementation"}
            
        async def control(self, direction, speed=255, hass=None):
            """Control robot movement."""
            return {"status": "error", "message": "Using fallback implementation"}

_LOGGER = logging.getLogger(__name__)

PLATFORMS = ["sensor"]

async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the ESP32 Robot component from configuration.yaml."""
    hass.data.setdefault(DOMAIN, {})
    
    # Настраиваем frontend
    await async_setup_frontend(hass)
    
    # Настраиваем прокси
    hass.data[DOMAIN]["proxy"] = await async_setup_proxy(hass)
    
    return True

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up ESP32 Robot from a config entry."""
    # Получаем данные из конфигурации
    host = entry.data.get(CONF_HOST, "")
    
    # Обратная совместимость: используем IP_ADDRESS, если HOST пустой
    if not host and entry.data.get(CONF_IP_ADDRESS):
        host = entry.data.get(CONF_IP_ADDRESS)
        _LOGGER.info(f"Using IP_ADDRESS '{host}' as HOST for backward compatibility")
        
        # Обновляем данные конфигурации для будущих запусков
        new_data = dict(entry.data)
        new_data[CONF_HOST] = host
        hass.config_entries.async_update_entry(entry, data=new_data)
    
    # Проверяем, что хост не пустой
    if not host:
        _LOGGER.error("Host or IP address is not configured")
        return False
        
    username = entry.data.get(CONF_USERNAME, "")
    password = entry.data.get(CONF_PASSWORD, "")
    
    # Создаем API-клиент
    api = ESP32RobotClient(host, username, password)

    # Проверяем соединение
    try:
        await api.get_status()
    except Exception as e:
        _LOGGER.error(f"Error connecting to ESP32 Robot: {e}")
        raise ConfigEntryNotReady(f"Error connecting to ESP32 Robot: {e}")
    
    # Сохраняем данные в hass.data
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {
        DATA_CLIENT: api,
        DATA_ENTITIES: [],
    }
    
    # Настраиваем прокси сервер для доступа к веб-интерфейсу робота
    if PROXY_VIEW not in hass.data.get(DOMAIN, {}):
        proxy_view = await async_setup_proxy(hass)
        hass.data[DOMAIN][PROXY_VIEW] = proxy_view
        
        # Генерируем уникальный ID для робота на основе хоста и entry_id
        robot_id = hashlib.md5(f"{host}-{entry.entry_id}".encode()).hexdigest()[:8]
        
        # Регистрируем робота в прокси
        proxy_url = proxy_view.register_robot(robot_id, host)
        
        # Сохраняем URL прокси для доступа к роботу
        hass.data[DOMAIN][entry.entry_id][PROXY_URL] = proxy_url
        
        # Регистрируем тот же робот в прямом прокси (без авторизации)
        for handler in hass.http.app.router._resources:
            if getattr(handler, 'resource_route', None) and handler.name == 'esp32_robot_direct':
                direct_proxy_url = f"/robot/{robot_id}/"
                hass.data[DOMAIN][entry.entry_id][DIRECT_PROXY_URL] = direct_proxy_url
                _LOGGER.info(f"Registered robot at direct proxy URL: {direct_proxy_url}")
                break
    else:
        proxy_view = hass.data[DOMAIN][PROXY_VIEW]
        
        # Генерируем уникальный ID для робота на основе хоста и entry_id
        robot_id = hashlib.md5(f"{host}-{entry.entry_id}".encode()).hexdigest()[:8]
        
        # Регистрируем робота в прокси
        proxy_url = proxy_view.register_robot(robot_id, host)
        
        # Сохраняем URL прокси для доступа к роботу
        hass.data[DOMAIN][entry.entry_id][PROXY_URL] = proxy_url
        
        # Регистрируем тот же робот в прямом прокси (без авторизации)
        for handler in hass.http.app.router._resources:
            if getattr(handler, 'resource_route', None) and handler.name == 'esp32_robot_direct':
                direct_proxy_url = f"/robot/{robot_id}/"
                hass.data[DOMAIN][entry.entry_id][DIRECT_PROXY_URL] = direct_proxy_url
                _LOGGER.info(f"Registered robot at direct proxy URL: {direct_proxy_url}")
                break
    
    # Регистрируем платформы
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    
    # Создаем сервис для управления роботом
    async def handle_control_service(call):
        """Handle the service call."""
        direction = call.data.get("direction", "stop")
        speed = call.data.get("speed", 255)
        duration = call.data.get("duration", 0)
        
        entry_id = call.data.get("entry_id", None)
        if entry_id is None:
            # Если entry_id не указан, используем первый найденный робот
            if not hass.data[DOMAIN]:
                _LOGGER.error("No ESP32 Robot configured")
                return
            entry_id = list(hass.data[DOMAIN].keys())[0]
            if entry_id == PROXY_VIEW:
                entry_id = list(hass.data[DOMAIN].keys())[1]
                
        if entry_id not in hass.data[DOMAIN]:
            _LOGGER.error(f"ESP32 Robot with entry_id {entry_id} not found")
            return
            
        client = hass.data[DOMAIN][entry_id][DATA_CLIENT]
        
        try:
            await client.control(direction, speed)
            
            if duration > 0:
                # Если указана продолжительность, останавливаем робота после этого времени
                async def stop_after_duration():
                    await asyncio.sleep(duration)
                    await client.control("stop")
                    
                asyncio.create_task(stop_after_duration())
                
        except Exception as e:
            _LOGGER.error(f"Error controlling ESP32 Robot: {e}")
    
    # Регистрируем сервис
    hass.services.async_register(
        DOMAIN, 
        "control", 
        handle_control_service, 
        schema=vol.Schema({
            vol.Optional("direction"): vol.In(["forward", "backward", "left", "right", "stop"]),
            vol.Optional("speed"): vol.All(vol.Coerce(int), vol.Range(min=0, max=255)),
            vol.Optional("duration"): vol.All(vol.Coerce(float), vol.Range(min=0)),
            vol.Optional("entry_id"): vol.All(cv.string),
        })
    )

    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    
    if unload_ok:
        # Получаем хост для генерации ID
        host = entry.data.get(CONF_HOST) or entry.data.get(CONF_IP_ADDRESS)
        if not host:
            _LOGGER.warning("Host not found in entry data, cannot unregister from proxy")
            return unload_ok
            
        # Генерируем ID робота
        robot_id = hashlib.md5(f"{host}-{entry.entry_id}".encode()).hexdigest()[:8]
        
        # Удаляем робота из прокси
        proxy = hass.data[DOMAIN].get("proxy")
        if proxy and robot_id in proxy.robots:
            del proxy.robots[robot_id]
            _LOGGER.info(f"Unregistered robot {robot_id} from proxy")
            
        hass.data[DOMAIN].pop(entry.entry_id)
    
    return unload_ok 