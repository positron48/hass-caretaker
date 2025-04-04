"""ESP32 Robot sensor platform."""
import logging
import asyncio
import aiohttp
import async_timeout
import json
from datetime import timedelta

from homeassistant.components.sensor import SensorEntity
from homeassistant.const import STATE_UNKNOWN
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.core import callback
from homeassistant.helpers.update_coordinator import (
    CoordinatorEntity,
    DataUpdateCoordinator,
)

from .const import DOMAIN, CONF_IP_ADDRESS, CONF_UPDATE_INTERVAL

_LOGGER = logging.getLogger(__name__)

DEFAULT_UPDATE_INTERVAL = timedelta(seconds=30)

async def async_setup_entry(hass, config_entry, async_add_entities):
    """Set up the ESP32 Robot sensor."""
    ip_address = config_entry.data.get(CONF_IP_ADDRESS)
    update_interval = timedelta(seconds=config_entry.data.get(CONF_UPDATE_INTERVAL, 30))

    coordinator = ESP32RobotDataCoordinator(
        hass, ip_address=ip_address, update_interval=update_interval
    )

    # Fetch initial data
    await coordinator.async_config_entry_first_refresh()

    async_add_entities([ESP32RobotSensor(coordinator, ip_address)], True)


class ESP32RobotDataCoordinator(DataUpdateCoordinator):
    """Class to manage fetching ESP32 Robot data."""

    def __init__(self, hass, ip_address, update_interval=DEFAULT_UPDATE_INTERVAL):
        """Initialize ESP32 Robot data coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            name=f"ESP32 Robot {ip_address}",
            update_interval=update_interval,
        )
        self.ip_address = ip_address
        self.session = async_get_clientsession(hass)
        self.last_error = None

    async def _async_update_data(self):
        """Fetch data from ESP32 Robot."""
        try:
            async with async_timeout.timeout(10):
                url = f"http://{self.ip_address}/status"
                async with self.session.get(url) as response:
                    if response.status != 200:
                        self.last_error = f"Error fetching status: HTTP {response.status}"
                        return {"status": "offline", "error": self.last_error}
                    
                    try:
                        data = await response.json()
                        # Add online status to data
                        data["status"] = "online"
                        self.last_error = None
                        return data
                    except json.JSONDecodeError:
                        self.last_error = "Invalid JSON response from robot"
                        return {"status": "offline", "error": self.last_error}
        except (asyncio.TimeoutError, aiohttp.ClientError) as err:
            self.last_error = f"Error connecting to robot: {str(err)}"
            return {"status": "offline", "error": self.last_error}


class ESP32RobotSensor(CoordinatorEntity, SensorEntity):
    """Representation of an ESP32 Robot sensor."""

    def __init__(self, coordinator, ip_address):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self.ip_address = ip_address
        self._attr_unique_id = f"esp32_robot_{ip_address.replace('.', '_')}"
        self._attr_name = f"ESP32 Robot {ip_address}"
        self._attr_icon = "mdi:robot"

    @property
    def state(self):
        """Return the state of the sensor."""
        return self.coordinator.data.get("status", STATE_UNKNOWN)

    @property
    def available(self):
        """Return if sensor is available."""
        return self.coordinator.last_update_success

    @property
    def extra_state_attributes(self):
        """Return the state attributes of the sensor."""
        attrs = {}
        attrs["ip_address"] = self.ip_address
        attrs["direct_url"] = f"http://{self.ip_address}"
        
        # Add additional attributes only if the robot is online
        if self.state == "online":
            if "fps" in self.coordinator.data:
                attrs["fps"] = self.coordinator.data.get("fps")
            
            if "streaming" in self.coordinator.data:
                attrs["streaming"] = self.coordinator.data.get("streaming")
            
            if self.coordinator.last_error:
                attrs["last_error"] = self.coordinator.last_error
        
        return attrs 