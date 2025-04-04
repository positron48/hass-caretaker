"""Frontend support for ESP32 Robot integration."""
import logging
import os
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.core import HomeAssistant
from homeassistant.components.http import StaticPathConfig

_LOGGER = logging.getLogger(__name__)

DOMAIN = "esp32_robot"
LOVELACE_CARD_URL = f"/{DOMAIN}/esp32-robot-card.js"
EDITOR_URL = f"/{DOMAIN}/editor.js"

async def async_setup_frontend(hass: HomeAssistant) -> bool:
    """Set up the ESP32 Robot frontend."""
    
    # Регистрируем ресурсы
    add_extra_js_url(hass, LOVELACE_CARD_URL)
    add_extra_js_url(hass, EDITOR_URL)
    
    # Пути к файлам
    card_path = str(Path(__file__).parent / "lovelace/esp32-robot-card.js")
    editor_path = str(Path(__file__).parent / "lovelace/editor.js")
    
    # Регистрируем конечные точки для статических файлов используя async версию
    await hass.http.async_register_static_paths([
        StaticPathConfig(LOVELACE_CARD_URL, card_path, True),
        StaticPathConfig(EDITOR_URL, editor_path, True)
    ])
    
    return True 