"""The ESP32 Robot integration."""
import logging
import os
import voluptuous as vol
import asyncio
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.components.http import HomeAssistantView
from homeassistant.components.sensor import DOMAIN as SENSOR_DOMAIN
import aiohttp
import async_timeout
from .const import DOMAIN
from .sensor import ESP32RobotSensor
from .frontend import async_setup_frontend

_LOGGER = logging.getLogger(__name__)

PLATFORMS = ["sensor"]

async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the ESP32 Robot component from configuration.yaml."""
    hass.data.setdefault(DOMAIN, {})
    
    # Настраиваем frontend для карточки Lovelace
    await async_setup_frontend(hass)
    
    return True

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up ESP32 Robot from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    
    # Register view for API endpoints
    hass.http.register_view(ESP32RobotProxyView(hass))
    
    # Forward to sensor platform
    hass.async_create_task(
        hass.config_entries.async_forward_entry_setup(entry, SENSOR_DOMAIN)
    )
    
    # Register frontend resources
    frontend_path = os.path.join(os.path.dirname(__file__), "lovelace")
    
    hass.http.register_static_path(
        f"/esp32_robot/frontend", frontend_path, cache_headers=False
    )
    
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_forward_entry_unload(entry, SENSOR_DOMAIN)

class ESP32RobotProxyView(HomeAssistantView):
    """View to handle ESP32 Robot requests."""
    
    url = "/api/esp32_robot/proxy/{sensor_id}/{path:.*}"
    name = "api:esp32_robot:proxy"
    requires_auth = True  # Ensures Home Assistant authentication
    
    def __init__(self, hass):
        """Initialize the proxy view."""
        self.hass = hass
    
    async def get(self, request, sensor_id, path):
        """Handle GET requests to the robot."""
        return await self._proxy_request(request, sensor_id, path, "GET")
    
    async def post(self, request, sensor_id, path):
        """Handle POST requests to the robot."""
        return await self._proxy_request(request, sensor_id, path, "POST")
    
    async def _proxy_request(self, request, sensor_id, path, method):
        """Proxy requests to the robot."""
        # Find the sensor entity
        for entity_id, entity in self.hass.data.get(SENSOR_DOMAIN, {}).items():
            if entity_id.endswith(sensor_id) and isinstance(entity, ESP32RobotSensor):
                sensor = entity
                break
        else:
            return self.json_message("Sensor not found", 404)
        
        # Check if robot is online
        if sensor.state != "online":
            return self.json_message("Robot is offline", 503)
        
        # Get robot IP address
        ip_address = sensor.ip_address
        if not ip_address:
            return self.json_message("Robot IP address not available", 500)
        
        # Forward request to robot
        url = f"http://{ip_address}/{path}"
        
        try:
            async with async_timeout.timeout(10):
                data = None
                if method == "POST":
                    data = await request.read()
                
                # Copy original headers (except host)
                headers = {}
                for name, value in request.headers.items():
                    if name.lower() not in ('host', 'authorization'):
                        headers[name] = value
                
                # Get query parameters
                params = request.query
                
                async with aiohttp.ClientSession() as session:
                    if method == "GET":
                        async with session.get(url, params=params, headers=headers) as response:
                            content_type = response.headers.get('Content-Type', 'application/json')
                            if 'image' in content_type or 'stream' in content_type:
                                # For images or streams, return raw content
                                data = await response.read()
                                return aiohttp.web.Response(body=data, content_type=content_type)
                            else:
                                # For other responses, return as JSON or text
                                text = await response.text()
                                return aiohttp.web.Response(text=text, content_type=content_type, status=response.status)
                    else:  # POST
                        async with session.post(url, params=params, data=data, headers=headers) as response:
                            text = await response.text()
                            content_type = response.headers.get('Content-Type', 'application/json')
                            return aiohttp.web.Response(text=text, content_type=content_type, status=response.status)
        
        except asyncio.TimeoutError:
            return self.json_message("Request to robot timed out", 504)
        except Exception as e:
            _LOGGER.error("Error proxying request to robot: %s", str(e))
            return self.json_message(f"Error: {str(e)}", 500) 