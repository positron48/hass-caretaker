"""Register the ESP32 Robot frontend elements."""
import os
import logging
from homeassistant.components.frontend import async_register_built_in_panel

_LOGGER = logging.getLogger(__name__)

async def async_setup_frontend(hass):
    """Set up the ESP32 Robot frontend elements."""
    await async_register_built_in_panel(
        hass,
        panel_title="ESP32 Robot",
        panel_icon="mdi:robot",
        frontend_url_path="esp32_robot",
        require_admin=True
    )
    
    # Register Lovelace resource
    hass.http.register_static_path(
        "/esp32_robot/frontend/esp32-robot-card.js",
        os.path.join(os.path.dirname(__file__), "lovelace/esp32-robot-card.js"),
        cache_headers=False
    )

    # Register interface HTML
    await hass.http.register_static_path(
        "/frontend_es5/esp32_robot_interface.html",
        os.path.join(os.path.dirname(__file__), "interface.html"),
        False
    ) 