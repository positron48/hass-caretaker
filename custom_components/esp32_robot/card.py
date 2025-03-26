"""Card for ESP32 Robot."""
import logging
import os
import voluptuous as vol
from homeassistant.components.http import HomeAssistantView
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from .const import DOMAIN, CONF_IP_ADDRESS, CONF_HOST, PROXY_URL

_LOGGER = logging.getLogger(__name__)

OPEN_IFRAME_SERVICE = "open_iframe"
IFRAME_SIGNAL = f"{DOMAIN}_iframe_signal"

async def async_setup_card(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Set up the iframe service for the ESP32 Robot."""
    try:
        _LOGGER.debug(f"Setting up card for entry_id: {entry.entry_id}")
        
        # Получаем данные для доступа к роботу
        host = entry.data.get(CONF_HOST) or entry.data.get(CONF_IP_ADDRESS)
        _LOGGER.debug(f"Card setup: host = {host}")
        
        # Получаем URL для доступа через прокси
        entry_data = hass.data.get(DOMAIN, {}).get(entry.entry_id, {})
        proxy_url = entry_data.get(PROXY_URL)
        _LOGGER.debug(f"Card setup: proxy_url = {proxy_url}")
        
        # Регистрируем сервис для открытия iframe
        async def open_iframe(call):
            """Open the iframe with the robot interface."""
            try:
                # Если есть прокси URL, используем его
                if proxy_url:
                    url = f"{hass.config.internal_url}{proxy_url}"
                else:
                    # Если нет прокси URL, используем прямой доступ по IP
                    url = f"http://{host}/"
                    
                _LOGGER.debug(f"Opening iframe with URL: {url}")
                hass.helpers.dispatcher.async_dispatcher_send(IFRAME_SIGNAL, url)
            except Exception as ex:
                _LOGGER.error(f"Error opening iframe: {ex}")
            
        hass.services.async_register(
            DOMAIN, 
            OPEN_IFRAME_SERVICE,
            open_iframe,
            schema=vol.Schema({})
        )
        
        _LOGGER.debug("Card setup completed successfully")
        return True
        
    except Exception as ex:
        _LOGGER.error(f"Error setting up card: {ex}")
        # Возвращаем True, чтобы не блокировать установку компонента
        return True 