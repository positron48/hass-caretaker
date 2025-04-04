"""Register the ESP32 Robot frontend elements."""
import os
import logging
from pathlib import Path
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.lovelace import async_register_resources

_LOGGER = logging.getLogger(__name__)

async def async_setup_frontend(hass):
    """Set up the ESP32 Robot frontend elements."""
    # Get file paths
    should_cache = False
    card_js_path = str(Path(__file__).parent / "lovelace/esp32-robot-card.js")
    editor_js_path = str(Path(__file__).parent / "lovelace/editor.js")
    interface_html_path = str(Path(__file__).parent / "interface.html")
    
    # Register Lovelace resource for the card JS and editor
    await hass.http.async_register_static_paths([
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

    # Register the card as a Lovelace resource
    resources = [
        {
            "url": "/esp32_robot/frontend/esp32-robot-card.js",
            "type": "module"
        }
    ]
    await async_register_resources(hass, resources)

    # Register interface HTML
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            "/esp32_robot/interface",
            interface_html_path,
            should_cache
        )
    ])
    
    return True 