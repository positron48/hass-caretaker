"""The ESP32 Robot integration."""
import logging
import hashlib
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
import asyncio
import voluptuous as vol
import homeassistant.helpers.config_validation as cv
from homeassistant.exceptions import ConfigEntryNotReady
import os

_LOGGER = logging.getLogger(__name__)

from .const import DOMAIN, CONF_IP_ADDRESS, CONF_HOST, CONF_USERNAME, CONF_PASSWORD, PROXY_VIEW, DATA_CLIENT, DATA_ENTITIES, PROXY_URL, DIRECT_PROXY_URL, ROOT_PATH
from .card import async_setup_card
from .frontend import async_setup_frontend
from .proxy import async_setup_proxy, ESP32RobotDirectProxyView, ESP32RobotProxyView

# Если есть проблемы с импортом из .controller, используем временный класс-заглушку
try:
    from .controller.robot_client import ESP32RobotClient
except ImportError:
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

PLATFORMS = ["sensor"]

# Упрощенная версия для диагностики
async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Базовая настройка интеграции ESP32 Robot."""
    _LOGGER.info("Setting up ESP32 Robot integration - minimal version")
    
    # Инициализируем хранилище данных
    hass.data.setdefault(DOMAIN, {})
    
    return True

# Упрощенная версия для диагностики
async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Базовая настройка для конфигурационной записи ESP32 Robot."""
    _LOGGER.info(f"Setting up ESP32 Robot entry {entry.entry_id} - minimal version")
    
    # Получаем данные из конфигурации
    host = entry.data.get(CONF_HOST, "")
    
    # Для обратной совместимости
    if not host and entry.data.get(CONF_IP_ADDRESS):
        host = entry.data.get(CONF_IP_ADDRESS)
        _LOGGER.info(f"Using IP_ADDRESS '{host}' as HOST for backward compatibility")
    
    # Подготавливаем хранилище данных
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {
        "host": host,
    }
    
    # Восстанавливаем карточку для Lovelace
    try:
        _LOGGER.debug("Setting up frontend card")
        await async_setup_frontend(hass)
        await async_setup_card(hass, entry)
        _LOGGER.debug("Card setup completed")
    except Exception as card_error:
        _LOGGER.error(f"Error setting up card: {card_error}")
        # Продолжаем работу даже если не удалось настроить карточку
    
    # Подключаем платформу сенсора
    _LOGGER.info(f"Setting up sensor platform for ESP32 Robot")
    # Правильный вызов с await и новым методом setups (множественное число)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    
    _LOGGER.info(f"ESP32 Robot entry {entry.entry_id} basic setup completed")
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Выгрузка конфигурационной записи."""
    _LOGGER.info(f"Unloading ESP32 Robot entry {entry.entry_id}")
    
    # Выгружаем платформы
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    
    # Простое удаление данных записи
    if unload_ok and entry.entry_id in hass.data.get(DOMAIN, {}):
        hass.data[DOMAIN].pop(entry.entry_id)
        _LOGGER.info(f"Removed entry data for {entry.entry_id}")
    
    return unload_ok 