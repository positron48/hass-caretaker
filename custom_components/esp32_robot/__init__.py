"""The ESP32 Robot integration."""
import logging
import hashlib
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN, CONF_IP_ADDRESS
from .card import async_setup_card
from .frontend import async_setup_frontend
from .proxy import async_setup_proxy

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
    hass.data.setdefault(DOMAIN, {})
    
    # Создаем ID робота из IP-адреса для использования в URL
    ip_address = entry.data.get(CONF_IP_ADDRESS)
    robot_id = hashlib.md5(ip_address.encode()).hexdigest()[:8]
    
    # Регистрируем робота в прокси
    proxy = hass.data[DOMAIN].get("proxy")
    if proxy:
        proxy_url = proxy.register_robot(robot_id, ip_address)
        _LOGGER.info(f"Registered robot {robot_id} with proxy at {proxy_url}")
        
        # Добавляем proxy_url в данные entry
        entry_data = dict(entry.data)
        entry_data["proxy_url"] = proxy_url
        hass.config_entries.async_update_entry(entry, data=entry_data)
    else:
        _LOGGER.warning("Proxy not available, robot will not be accessible from external networks")
    
    hass.data[DOMAIN][entry.entry_id] = entry.data
    
    # Настраиваем платформы
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    
    # Настраиваем карточку с iframe
    await async_setup_card(hass, entry)
    
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    
    if unload_ok:
        # Удаляем робота из прокси
        ip_address = entry.data.get(CONF_IP_ADDRESS)
        robot_id = hashlib.md5(ip_address.encode()).hexdigest()[:8]
        
        proxy = hass.data[DOMAIN].get("proxy")
        if proxy and robot_id in proxy.robots:
            del proxy.robots[robot_id]
            _LOGGER.info(f"Unregistered robot {robot_id} from proxy")
            
        hass.data[DOMAIN].pop(entry.entry_id)
    
    return unload_ok 