"""Controller for ESP32 Robot."""
import logging
import json
import aiohttp
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from ..const import STATUS_ENDPOINT

_LOGGER = logging.getLogger(__name__)

class RobotController:
    """Controller for ESP32 Robot API interaction."""
    
    def __init__(self, hass, ip_address):
        """Initialize the controller."""
        self.hass = hass
        self.ip_address = ip_address
        self.session = async_get_clientsession(hass)
        
    async def get_status(self):
        """Get robot status.
        
        Returns a dict with:
        - status: online, offline, or unknown
        - bt_enabled: bool
        - bt_connected: bool
        - bt_status: str
        """
        try:
            url = f"http://{self.ip_address}{STATUS_ENDPOINT}"
            async with self.session.get(url, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "status": "online",
                        "bt_enabled": data.get("enabled", False),
                        "bt_connected": data.get("connected", False),
                        "bt_status": data.get("status", "Неизвестно")
                    }
                return {"status": "offline"}
        except aiohttp.ClientError as e:
            _LOGGER.error(f"API error: {e}")
            return {"status": "offline", "error": str(e)}
        except json.JSONDecodeError as e:
            _LOGGER.error(f"JSON decode error: {e}")
            return {"status": "online", "error": f"Invalid response format: {e}"}
        except Exception as e:
            _LOGGER.error(f"Error checking robot status: {e}")
            return {"status": "unknown", "error": str(e)} 