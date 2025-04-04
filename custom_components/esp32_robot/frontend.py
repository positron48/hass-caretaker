"""Register the ESP32 Robot frontend elements."""
import os
import logging

_LOGGER = logging.getLogger(__name__)

async def async_setup_frontend(hass):
    """Set up the ESP32 Robot frontend elements."""
    # Register Lovelace resource for the card JS
    hass.http.register_static_path(
        "/esp32_robot/frontend/esp32-robot-card.js",
        os.path.join(os.path.dirname(__file__), "lovelace/esp32-robot-card.js"),
        cache_headers=False
    )

    # Register interface HTML
    hass.http.register_static_path(
        "/esp32_robot/interface",
        os.path.join(os.path.dirname(__file__), "interface.html"),
        cache_headers=False
    )
    
    return True 