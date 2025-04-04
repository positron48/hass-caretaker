"""Register the ESP32 Robot frontend elements."""
import os
import logging
from homeassistant.components.frontend import async_register_built_in_panel

_LOGGER = logging.getLogger(__name__)

async def async_setup_frontend(hass):
    """Set up the ESP32 Robot frontend."""
    # Register card
    root_path = os.path.dirname(__file__)
    
    # Register Lovelace card
    await hass.components.frontend.async_register_built_in_panel(
        "iframe",
        "esp32_robot",
        "ESP32 Robot",
        "mdi:robot",
        {"url": "/api/esp32_robot/interface"},
        require_admin=False,
    )
    
    # Register Lovelace resources
    await hass.components.lovelace.async_register_resource(
        {
            "url": "/esp32_robot/frontend/esp32-robot-card.js",
            "type": "module",
        }
    )
    
    # Register interface HTML
    await hass.http.register_static_path(
        "/frontend_es5/esp32_robot_interface.html",
        os.path.join(root_path, "interface.html"),
        False
    ) 