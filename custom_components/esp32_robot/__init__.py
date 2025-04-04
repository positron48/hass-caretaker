"""The ESP32 Robot integration."""
import logging
import os
import voluptuous as vol
import asyncio
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.components.http.auth import async_sign_path, async_validate_signed_request
from homeassistant.components.sensor import DOMAIN as SENSOR_DOMAIN
from homeassistant.helpers import entity_registry
import aiohttp
import async_timeout
from .const import DOMAIN
from .sensor import ESP32RobotSensor
from .frontend import async_setup_frontend
from pathlib import Path
from datetime import timedelta

_LOGGER = logging.getLogger(__name__)

PLATFORMS = ["sensor"]

async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the ESP32 Robot component from configuration.yaml."""
    hass.data.setdefault(DOMAIN, {})
    
    # Setup frontend for Lovelace card
    await async_setup_frontend(hass)
    
    return True

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up ESP32 Robot from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    
    # Register view for API endpoints
    hass.http.register_view(ESP32RobotProxyView(hass))
    hass.http.register_view(ESP32RobotSignedUrlView(hass))
    
    # Forward to sensor platform
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    
    # Register frontend resources
    lovelace_path = str(Path(__file__).parent / "lovelace")
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            f"/esp32_robot/frontend",
            lovelace_path,
            False
        )
    ])
    
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

class ESP32RobotProxyView(HomeAssistantView):
    """View to handle ESP32 Robot requests."""
    
    url = "/api/esp32_robot/proxy/{sensor_id}/{path:.*}"
    name = "api:esp32_robot:proxy"
    requires_auth = True  # Use Home Assistant's built-in auth validation
    
    def __init__(self, hass):
        """Initialize the proxy view."""
        self.hass = hass
    
    async def get(self, request, sensor_id, path):
        """Handle GET requests to the robot."""
        # For stream path, validate signed request if present
        if path == "stream":
            # Allow both auth methods: standard auth and signed URLs
            is_valid_signed = await async_validate_signed_request(request)
            
            # If not a valid signed URL, fall back to standard auth
            # Since requires_auth = True, this will already be handled by HomeAssistant
            if not is_valid_signed and 'hass_user' not in request:
                return aiohttp.web.Response(status=401, text="Unauthorized")
        
        return await self._proxy_request(request, sensor_id, path, "GET")
    
    async def post(self, request, sensor_id, path):
        """Handle POST requests to the robot."""
        return await self._proxy_request(request, sensor_id, path, "POST")
    
    async def _proxy_request(self, request, sensor_id, path, method):
        """Proxy requests to the robot."""
        try:
            # Debug sensor domain and hass.data keys
            _LOGGER.debug("SENSOR_DOMAIN = %s", SENSOR_DOMAIN)
            _LOGGER.debug("hass.data keys: %s", list(self.hass.data.keys()))
            
            # Reconstruct full entity_id
            full_entity_id = f"sensor.{sensor_id}"
            _LOGGER.debug("Looking for sensor entity with ID: %s", full_entity_id)
            
            # First try to get the entity from the entity registry
            er = entity_registry.async_get(self.hass)
            entity_entry = er.async_get(full_entity_id)
            
            if entity_entry:
                _LOGGER.debug("Found entity in registry: %s (platform: %s)", 
                             entity_entry.entity_id, entity_entry.platform)
            else:
                _LOGGER.debug("Entity not found in registry: %s", full_entity_id)
            
            # Try to get the entity state directly
            state = self.hass.states.get(full_entity_id)
            entity = None
            
            if state is not None:
                _LOGGER.debug("Found entity state by direct lookup: %s (state: %s)", full_entity_id, state.state)
                _LOGGER.debug("State attributes: %s", state.attributes)
                
                # Try to get the IP address from state attributes
                ip_address = state.attributes.get('ip_address')
                
                if ip_address:
                    _LOGGER.debug("Using IP address from state attributes: %s", ip_address)
                    
                    # Check if robot is online based on state value
                    if state.state != "online":
                        return self.json_message("Robot is offline", 503)
                    
                    # Forward request to robot
                    url = f"http://{ip_address}/{path}"
                    _LOGGER.debug("Forwarding request to robot at %s: %s %s", ip_address, method, path)
                    
                    try:
                        async with async_timeout.timeout(10):
                            data = None
                            if method == "POST":
                                data = await request.read()
                            
                            # Copy original headers (except host and authorization)
                            headers = {}
                            for name, value in request.headers.items():
                                if name.lower() not in ('host', 'authorization'):
                                    headers[name] = value
                            
                            # Get query parameters
                            params = dict(request.query)
                            
                            # Create a client session and make the request
                            async with aiohttp.ClientSession() as session:
                                if method == "GET":
                                    async with session.get(url, params=params, headers=headers) as response:
                                        content_type = response.headers.get('Content-Type', 'application/json')
                                        _LOGGER.debug("Response content type: %s for path: %s", content_type, path)
                                        
                                        if 'multipart/x-mixed-replace' in content_type:
                                            # For MJPEG streams, we need to create a streaming response
                                            _LOGGER.debug("Handling MJPEG stream from %s", url)
                                            
                                            # Create a response object with the same headers
                                            resp = aiohttp.web.StreamResponse(status=response.status)
                                            for name, value in response.headers.items():
                                                if name.lower() not in ('transfer-encoding',):
                                                    resp.headers[name] = value
                                            
                                            # Start the response
                                            await resp.prepare(request)
                                            _LOGGER.debug("MJPEG stream response prepared")
                                            
                                            # Stream the content
                                            try:
                                                async for chunk in response.content.iter_any():
                                                    await resp.write(chunk)
                                            except Exception as e:
                                                _LOGGER.error("Error streaming MJPEG content: %s", str(e))
                                                return self.json_message(f"Streaming error: {str(e)}", 500)
                                            
                                            _LOGGER.debug("MJPEG stream completed")
                                            # End the response
                                            await resp.write_eof()
                                            return resp
                                        elif 'image' in content_type:
                                            # For static images, return raw content
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
                        _LOGGER.error("Error forwarding request to robot: %s", str(e))
                        return self.json_message(f"Error: {str(e)}", 500)
                
                else:
                    _LOGGER.error("IP address not found in entity attributes")
                    return self.json_message("Robot IP address not available", 500)
            
            else:
                _LOGGER.error("Sensor state not found for ID: %s", full_entity_id)
                return self.json_message("Sensor not found", 404)
                
        except Exception as e:
            _LOGGER.error("Unexpected error in proxy request: %s", str(e))
            return self.json_message(f"Server error: {str(e)}", 500)

class ESP32RobotSignedUrlView(HomeAssistantView):
    """View to generate signed URLs for ESP32 Robot streams."""
    
    url = "/api/esp32_robot/get_signed_url"
    name = "api:esp32_robot:get_signed_url"
    requires_auth = True  # This endpoint still requires auth to get the signed URL
    
    def __init__(self, hass):
        """Initialize the signed URL view."""
        self.hass = hass
    
    async def get(self, request):
        """Handle GET requests for signed URLs."""
        # Get parameters
        robot_id = request.query.get("id")
        
        if not robot_id:
            return self.json_message("Missing required parameter: id", 400)
        
        # Generate a signed URL for the stream endpoint
        try:
            # Check if the robot entity exists and is online
            full_entity_id = f"sensor.{robot_id}"
            state = self.hass.states.get(full_entity_id)
            
            if not state:
                return self.json_message(f"Robot entity not found: {full_entity_id}", 404)
                
            if state.state != "online":
                return self.json_message(f"Robot is offline: {full_entity_id}", 503)
            
            # Generate a signed URL with a short expiration (2 minutes)
            signed_url = await async_sign_path(
                self.hass,
                request,
                f"/api/esp32_robot/proxy/{robot_id}/stream",
                timedelta(minutes=2)
            )
            
            # Get IP address from entity attributes
            ip_address = state.attributes.get('ip_address', 'unknown')
            
            return self.json({
                "signed_url": signed_url,
                "expires_in": 120,  # seconds
                "robot_id": robot_id,
                "ip_address": ip_address,
                "state": state.state
            })
        
        except Exception as e:
            _LOGGER.error("Error generating signed URL: %s", str(e))
            return self.json_message(f"Error generating signed URL: {str(e)}", 500) 