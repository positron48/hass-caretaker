"""Register the ESP32 Robot frontend elements."""
import os
import logging
from homeassistant.components.http.static import StaticPathConfig

_LOGGER = logging.getLogger(__name__)

async def async_setup_frontend(hass):
    """Set up the ESP32 Robot frontend elements."""
    # Register Lovelace resource for the card JS
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            "/esp32_robot/frontend/esp32-robot-card.js",
            os.path.join(os.path.dirname(__file__), "lovelace/esp32-robot-card.js"),
            False
        )
    ])

    # Register interface HTML
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            "/esp32_robot/interface",
            os.path.join(os.path.dirname(__file__), "interface.html"),
            False
        )
    ])
    
    return True 