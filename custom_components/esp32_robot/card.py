"""Card for ESP32 Robot."""
import logging
import os
import voluptuous as vol
from homeassistant.components.http import HomeAssistantView
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from .const import DOMAIN, CONF_IP_ADDRESS

_LOGGER = logging.getLogger(__name__)

OPEN_IFRAME_SERVICE = "open_iframe"
IFRAME_SIGNAL = f"{DOMAIN}_iframe_signal"

async def async_setup_card(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Set up the iframe service for the ESP32 Robot."""
    ip_address = entry.data.get(CONF_IP_ADDRESS)
    # Получаем proxy_url, если он доступен
    proxy_url = entry.data.get("proxy_url")
    
    # Регистрируем сервис для открытия iframe
    async def open_iframe(call):
        """Open the iframe with the robot interface."""
        # Используем прокси-URL, если он доступен, иначе используем прямой URL
        if proxy_url:
            url = proxy_url
        else:
            url = f"http://{ip_address}/"
        hass.helpers.dispatcher.async_dispatcher_send(IFRAME_SIGNAL, url)
        
    hass.services.async_register(
        DOMAIN, 
        OPEN_IFRAME_SERVICE,
        open_iframe,
        schema=vol.Schema({})
    )
    
    return True 