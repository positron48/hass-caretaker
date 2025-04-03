"""Frontend support for ESP32 Robot integration."""
import logging
import os
from dataclasses import dataclass

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

DOMAIN = "esp32_robot"
LOVELACE_CARD_URL = f"/{DOMAIN}/esp32-robot-card.js"
EDITOR_URL = f"/{DOMAIN}/editor.js"

@dataclass
class StaticPathConfig:
    """Class to define a static path configuration."""
    
    url_path: str
    file_path: str
    cache_headers: bool

async def async_setup_frontend(hass: HomeAssistant) -> bool:
    """Set up the ESP32 Robot frontend."""
    
    # Регистрируем ресурсы
    add_extra_js_url(hass, LOVELACE_CARD_URL)
    add_extra_js_url(hass, EDITOR_URL)
    
    # Регистрируем конечные точки для статических файлов используя async версию
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            url_path=LOVELACE_CARD_URL,
            file_path=os.path.join(os.path.dirname(__file__), "lovelace/esp32-robot-card.js"),
            cache_headers=True
        ),
        StaticPathConfig(
            url_path=EDITOR_URL,
            file_path=os.path.join(os.path.dirname(__file__), "lovelace/editor.js"),
            cache_headers=True
        )
    ])
    
    return True 