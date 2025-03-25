"""Client for ESP32 Robot."""
import logging
import json
import aiohttp
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from ..const import STATUS_ENDPOINT, CONTROL_ENDPOINT

_LOGGER = logging.getLogger(__name__)

class ESP32RobotClient:
    """Client for ESP32 Robot API interaction."""
    
    def __init__(self, host, username=None, password=None):
        """Initialize the client.
        
        Args:
            host: IP address or hostname of the robot
            username: Optional username for authentication
            password: Optional password for authentication
        """
        self.host = host
        self.username = username
        self.password = password
        self.session = None
        
    async def _get_session(self, hass):
        """Get or create aiohttp session."""
        if self.session is None:
            self.session = async_get_clientsession(hass)
        return self.session
        
    async def get_status(self, hass=None):
        """Get robot status.
        
        Returns a dict with:
        - status: online, offline, or unknown
        - bt_enabled: bool
        - bt_connected: bool
        - bt_status: str
        """
        session = await self._get_session(hass)
        
        try:
            url = f"http://{self.host}{STATUS_ENDPOINT}"
            auth = None
            if self.username and self.password:
                auth = aiohttp.BasicAuth(self.username, self.password)
                
            async with session.get(url, auth=auth, timeout=10) as response:
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
            
    async def control(self, direction, speed=255, hass=None):
        """Control robot movement.
        
        Args:
            direction: forward, backward, left, right, or stop
            speed: 0-255 value for motor speed
            hass: HomeAssistant instance (optional)
            
        Returns:
            dict: Response from the robot
        """
        session = await self._get_session(hass)
        
        try:
            url = f"http://{self.host}{CONTROL_ENDPOINT}"
            data = {
                "direction": direction,
                "speed": speed
            }
            
            auth = None
            if self.username and self.password:
                auth = aiohttp.BasicAuth(self.username, self.password)
                
            async with session.post(url, json=data, auth=auth, timeout=10) as response:
                if response.status == 200:
                    return await response.json()
                return {"status": "error", "message": f"Request failed with code {response.status}"}
        except Exception as e:
            _LOGGER.error(f"Error controlling robot: {e}")
            return {"status": "error", "message": str(e)} 