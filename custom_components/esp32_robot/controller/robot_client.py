"""Client for ESP32 Robot."""
import logging
import json
import aiohttp
import traceback
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
        _LOGGER.debug(f"Initialized ESP32RobotClient with host: {host}, username: {'set' if username else 'not set'}")
        
    async def _get_session(self, hass):
        """Get or create aiohttp session."""
        try:
            if self.session is None:
                if hass is None:
                    # Создаем клиентскую сессию без привязки к Home Assistant
                    _LOGGER.debug("Creating standalone aiohttp session")
                    self.session = aiohttp.ClientSession()
                else:
                    _LOGGER.debug("Getting aiohttp session from Home Assistant")
                    self.session = async_get_clientsession(hass)
            return self.session
        except Exception as e:
            _LOGGER.error(f"Error getting aiohttp session: {e}")
            _LOGGER.error(f"Traceback: {traceback.format_exc()}")
            # Возвращаем новую сессию в крайнем случае
            return aiohttp.ClientSession()
        
    async def get_status(self, hass=None):
        """Get robot status.
        
        Returns a dict with:
        - status: online, offline, or unknown
        - bt_enabled: bool
        - bt_connected: bool
        - bt_status: str
        """
        # Проверяем, что хост задан и не пустой
        if not self.host:
            _LOGGER.error("Host is empty, cannot perform API request")
            return {"status": "unknown", "error": "Host not configured"}
        
        _LOGGER.debug(f"Getting status from robot at {self.host}")    
        
        try:
            session = await self._get_session(hass)
            _LOGGER.debug(f"Using session: {session}")
            
            url = f"http://{self.host}{STATUS_ENDPOINT}"
            _LOGGER.debug(f"Status URL: {url}")
            
            auth = None
            if self.username and self.password:
                auth = aiohttp.BasicAuth(self.username, self.password)
                _LOGGER.debug("Using authentication")
            
            try:
                _LOGGER.debug("Sending GET request to robot")
                async with session.get(url, auth=auth, timeout=10) as response:
                    _LOGGER.debug(f"Got response with status code: {response.status}")
                    
                    if response.status == 200:
                        try:
                            data = await response.json()
                            _LOGGER.debug(f"Response data: {data}")
                            return {
                                "status": "online",
                                "bt_enabled": data.get("enabled", False),
                                "bt_connected": data.get("connected", False),
                                "bt_status": data.get("status", "Неизвестно")
                            }
                        except json.JSONDecodeError as je:
                            _LOGGER.error(f"JSON decode error: {je}")
                            text = await response.text()
                            _LOGGER.error(f"Raw response: {text[:200]}...")
                            return {"status": "online", "error": f"Invalid response format: {je}"}
                    
                    _LOGGER.warning(f"Robot returned non-200 status: {response.status}")
                    text = await response.text()
                    _LOGGER.warning(f"Response body: {text[:200]}...")
                    return {"status": "offline", "http_status": response.status}
            except aiohttp.ClientError as e:
                _LOGGER.error(f"API error: {e}")
                return {"status": "offline", "error": str(e)}
        except Exception as e:
            _LOGGER.error(f"Error checking robot status: {e}")
            _LOGGER.error(f"Traceback: {traceback.format_exc()}")
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
        # Проверяем, что хост задан и не пустой
        if not self.host:
            _LOGGER.error("Host is empty, cannot perform API request")
            return {"status": "error", "message": "Host not configured"}
        
        _LOGGER.debug(f"Controlling robot at {self.host}, direction: {direction}, speed: {speed}")
        
        try:
            session = await self._get_session(hass)
            _LOGGER.debug(f"Using session: {session}")
            
            url = f"http://{self.host}{CONTROL_ENDPOINT}"
            data = {
                "direction": direction,
                "speed": speed
            }
            
            _LOGGER.debug(f"Control URL: {url}, data: {data}")
            
            auth = None
            if self.username and self.password:
                auth = aiohttp.BasicAuth(self.username, self.password)
                _LOGGER.debug("Using authentication")
            
            try:
                _LOGGER.debug("Sending POST request to robot")
                async with session.post(url, json=data, auth=auth, timeout=10) as response:
                    _LOGGER.debug(f"Got response with status code: {response.status}")
                    
                    if response.status == 200:
                        try:
                            result = await response.json()
                            _LOGGER.debug(f"Response data: {result}")
                            return result
                        except json.JSONDecodeError as je:
                            _LOGGER.error(f"JSON decode error: {je}")
                            text = await response.text()
                            _LOGGER.error(f"Raw response: {text[:200]}...")
                            return {"status": "error", "message": f"Invalid response format: {je}"}
                    
                    _LOGGER.warning(f"Robot returned non-200 status: {response.status}")
                    text = await response.text()
                    _LOGGER.warning(f"Response body: {text[:200]}...")
                    return {"status": "error", "message": f"Request failed with code {response.status}"}
            except aiohttp.ClientError as e:
                _LOGGER.error(f"API error during control: {e}")
                return {"status": "error", "message": f"Connection error: {e}"}
        except Exception as e:
            _LOGGER.error(f"Error controlling robot: {e}")
            _LOGGER.error(f"Traceback: {traceback.format_exc()}")
            return {"status": "error", "message": str(e)} 