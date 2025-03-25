"""Frontend support for ESP32 Robot integration."""
import logging
import os
import json
import voluptuous as vol

from homeassistant.components.frontend import async_register_built_in_panel
from homeassistant.components.lovelace.resources import ResourceStorageCollection
from homeassistant.components.lovelace import _register_panel
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

DOMAIN = "esp32_robot"
LOVELACE_CARD_URL = f"/{DOMAIN}/esp32-robot-card.js"
EDITOR_URL = f"/{DOMAIN}/editor.js"

async def async_setup_frontend(hass: HomeAssistant) -> bool:
    """Set up the ESP32 Robot frontend."""
    
    # Регистрируем ресурсы
    add_extra_js_url(hass, LOVELACE_CARD_URL)
    add_extra_js_url(hass, EDITOR_URL)
    
    # Регистрируем конечные точки для статических файлов
    hass.http.register_static_path(
        LOVELACE_CARD_URL,
        os.path.join(os.path.dirname(__file__), "lovelace/esp32-robot-card.js"),
        True
    )
    hass.http.register_static_path(
        EDITOR_URL,
        os.path.join(os.path.dirname(__file__), "lovelace/editor.js"),
        True
    )
    
    # Пытаемся зарегистрировать ресурсы в хранилище Lovelace
    try:
        if "lovelace" in hass.data:
            resources = hass.data["lovelace"].get("resources")
            if isinstance(resources, ResourceStorageCollection):
                await _register_resource(hass, resources, LOVELACE_CARD_URL, "module")
                await _register_resource(hass, resources, EDITOR_URL, "module")
                _LOGGER.info("ESP32 Robot Lovelace resources registered successfully")
            else:
                _LOGGER.warning("Could not find ResourceStorageCollection to register lovelace resources")
    except Exception as ex:
        _LOGGER.warning(f"Failed to register resources: {ex}")
    
    return True

async def _register_resource(hass, resources, url, resource_type):
    """Register a resource if it doesn't already exist."""
    
    # Проверяем, существует ли ресурс уже
    for resource in resources.async_items():
        if resource["url"] == url:
            return
    
    # Добавляем ресурс
    try:
        await resources.async_create_item({"url": url, "type": resource_type})
        _LOGGER.info(f"Registered resource: {url}")
    except Exception as ex:
        _LOGGER.warning(f"Failed to register resource {url}: {ex}") 