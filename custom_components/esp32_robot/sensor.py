"""Sensor platform for ESP32 Robot."""
import logging
import asyncio
import aiohttp
from datetime import timedelta
import json

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import DOMAIN, CONF_IP_ADDRESS, CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    """Set up ESP32 Robot sensor based on a config entry."""
    ip_address = entry.data.get(CONF_IP_ADDRESS)
    scan_interval = entry.data.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL)
    
    # Создаем сервис для проверки статуса
    session = async_get_clientsession(hass)
    
    # Создаем координатор для обновления данных
    coordinator = ESP32RobotCoordinator(hass, session, ip_address, scan_interval)
    await coordinator.async_config_entry_first_refresh()
    
    async_add_entities([ESP32RobotSensor(coordinator, entry)])

class ESP32RobotCoordinator(DataUpdateCoordinator):
    """Class to manage fetching ESP32 Robot data."""

    def __init__(self, hass, session, ip_address, scan_interval):
        """Initialize."""
        self.session = session
        self.ip_address = ip_address
        
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
            # Проверяем статус робота по эндпоинту /status
            status_url = f"http://{self.ip_address}/status"
            
            async with self.session.get(status_url, timeout=5) as response:
                if response.status == 200:
                    try:
                        data = await response.json()
                        return {
                            "status": "online",
                            "data": data
                        }
                    except (json.JSONDecodeError, aiohttp.ContentTypeError):
                        # Если получен неверный JSON, считаем робота оффлайн
                        return {
                            "status": "offline",
                            "error": "Invalid JSON response"
                        }
                else:
                    return {
                        "status": "offline",
                        "error": f"Status code: {response.status}"
                    }
                    
        except (aiohttp.ClientError, asyncio.TimeoutError) as err:
            return {
                "status": "offline",
                "error": str(err)
            }
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
        }
        
        # Добавляем прямой URL к роботу
        attrs["direct_url"] = f"http://{self._ip_address}/"
        
        # Добавляем дополнительные данные из API, если робот онлайн
        if self.coordinator.data and self.coordinator.data.get("status") == "online":
            if "data" in self.coordinator.data and isinstance(self.coordinator.data["data"], dict):
                # Добавляем данные из статуса, например fps и streaming
                robot_data = self.coordinator.data["data"]
                if "fps" in robot_data:
                    attrs["fps"] = robot_data["fps"]
                if "streaming" in robot_data:
                    attrs["streaming"] = robot_data["streaming"]
            
            # Добавляем ошибку только если робот онлайн
            if "error" in self.coordinator.data:
                attrs["last_error"] = self.coordinator.data["error"]
            
        return attrs

    async def async_update(self):
        """Update the entity."""
        await self.coordinator.async_request_refresh() 