"""Sensor platform for ESP32 Robot."""
import logging
import asyncio
import aiohttp
from datetime import timedelta

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import DOMAIN, CONF_IP_ADDRESS, CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL
from .service.robot_service import RobotService

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    """Set up ESP32 Robot sensor based on a config entry."""
    ip_address = entry.data.get(CONF_IP_ADDRESS)
    scan_interval = entry.data.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL)
    
    # Создаем сервис для бизнес-логики
    robot_service = RobotService(hass, ip_address)
    
    # Создаем координатор для обновления данных
    coordinator = ESP32RobotCoordinator(hass, robot_service, scan_interval)
    await coordinator.async_config_entry_first_refresh()
    
    async_add_entities([ESP32RobotSensor(coordinator, entry)])

class ESP32RobotCoordinator(DataUpdateCoordinator):
    """Class to manage fetching ESP32 Robot data."""

    def __init__(self, hass, robot_service, scan_interval):
        """Initialize."""
        self.robot_service = robot_service
        
        update_interval = timedelta(seconds=scan_interval)
        
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=update_interval,
        )

    async def _async_update_data(self):
        """Fetch data from ESP32 Robot."""
        try:
            return await self.robot_service.check_status()
        except (aiohttp.ClientError, asyncio.TimeoutError) as err:
            raise UpdateFailed(f"Error communicating with API: {err}")
        except Exception as err:
            raise UpdateFailed(f"Unknown error: {err}")

class ESP32RobotSensor(SensorEntity):
    """Representation of a ESP32 Robot sensor."""

    def __init__(self, coordinator, entry):
        """Initialize the sensor."""
        self.coordinator = coordinator
        self._entry = entry
        self._ip_address = entry.data.get(CONF_IP_ADDRESS)
        self._attr_unique_id = f"{DOMAIN}_{self._ip_address}_status"
        self._attr_name = f"ESP32 Robot Status"
        self._attr_native_value = "unknown"

    @property
    def available(self) -> bool:
        """Return if entity is available."""
        return self.coordinator.last_update_success

    @property
    def icon(self):
        """Return the icon."""
        status = self.coordinator.data.get("status", "unknown")
        if status == "online":
            return "mdi:robot"
        return "mdi:robot-off"

    @property
    def native_value(self):
        """Return the state of the sensor."""
        if self.coordinator.data:
            return self.coordinator.data.get("status", "unknown")
        return "unknown"

    @property
    def extra_state_attributes(self):
        """Return the state attributes."""
        attrs = {
            "ip_address": self._ip_address,
            "iframe_url": f"http://{self._ip_address}/",
        }
        
        # Добавляем дополнительные данные из API, если они есть
        if self.coordinator.data and self.coordinator.data.get("status") == "online":
            attrs["bt_enabled"] = self.coordinator.data.get("bt_enabled", False)
            attrs["bt_connected"] = self.coordinator.data.get("bt_connected", False)
            attrs["bt_status"] = self.coordinator.data.get("bt_status", "Неизвестно")
            
        if self.coordinator.data and "error" in self.coordinator.data:
            attrs["last_error"] = self.coordinator.data["error"]
            
        return attrs

    async def async_update(self):
        """Update the entity."""
        await self.coordinator.async_request_refresh() 