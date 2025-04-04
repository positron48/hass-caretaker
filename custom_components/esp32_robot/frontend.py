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
    
    # Register Lovelace resources
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            "/local/esp32-robot-card.js",
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
    
    # Print a message to the logs to inform user about adding resource
    path = "/local/esp32-robot-card.js"
    _LOGGER.warning(
        f"ESP32 Robot Card: Add this resource to Lovelace to use the card: "
        f"URL: {path}, Resource type: module"
    )
    
    return True 