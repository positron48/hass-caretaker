"""Register the ESP32 Robot frontend elements."""
import os
import logging
from pathlib import Path
from homeassistant.components.http import StaticPathConfig

_LOGGER = logging.getLogger(__name__)

async def async_setup_frontend(hass):
    """Set up the ESP32 Robot frontend elements."""
    # Get file paths
    should_cache = False
    module_js_path = str(Path(__file__).parent / "lovelace/card-module.js")
    card_js_path = str(Path(__file__).parent / "lovelace/esp32-robot-card.js")
    editor_js_path = str(Path(__file__).parent / "lovelace/editor.js")
    
    # Register Lovelace resource for the card JS and editor
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            "/esp32_robot/card-module.js",
            module_js_path,
            should_cache
        ),
        StaticPathConfig(
            "/esp32_robot/frontend/esp32-robot-card.js",
            card_js_path,
            should_cache
        ),
        StaticPathConfig(
            "/esp32_robot/frontend/editor.js",
            editor_js_path,
            should_cache
        )
    ])
    
    return True 