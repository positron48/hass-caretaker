"""Register the ESP32 Robot frontend elements."""
import logging
from pathlib import Path
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.frontend import add_extra_js_url

_LOGGER = logging.getLogger(__name__)

DOMAIN = "esp32_robot"
LOVELACE_CARD_URL = f"/{DOMAIN}/esp32-robot-card.js"
EDITOR_URL = f"/{DOMAIN}/editor.js"

async def async_setup_frontend(hass):
    """Set up the ESP32 Robot frontend elements."""
    # Add scripts to frontend
    add_extra_js_url(hass, LOVELACE_CARD_URL)
    add_extra_js_url(hass, EDITOR_URL)
    
    # Get file paths
    card_path = str(Path(__file__).parent / "lovelace/esp32-robot-card.js")
    editor_path = str(Path(__file__).parent / "lovelace/editor.js")
    
    # Register static paths
    await hass.http.async_register_static_paths([
        StaticPathConfig(LOVELACE_CARD_URL, card_path, True),
        StaticPathConfig(EDITOR_URL, editor_path, True)
    ])
    
    _LOGGER.info("ESP32 Robot card registered successfully")
    
    return True 