"""Sensor platform for ESP32 Robot."""
import logging
from datetime import timedelta

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from .const import (
    DOMAIN, 
    CONF_IP_ADDRESS, 
    CONF_HOST,
    DEFAULT_SCAN_INTERVAL
)

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    """Set up ESP32 Robot sensor based on a config entry."""
    _LOGGER.info(f"Setting up ESP32 Robot sensor for entry {entry.entry_id}")
    
    try:
        host = entry.data.get(CONF_HOST) or entry.data.get(CONF_IP_ADDRESS) or "unknown"
        
        # Упрощенная версия без координатора для диагностики
        async_add_entities([ESP32RobotSensor(host, entry.entry_id)])
        _LOGGER.debug(f"Added ESP32RobotSensor for host {host}")
    except Exception as ex:
        _LOGGER.error(f"Error setting up ESP32 Robot sensor: {ex}")

class ESP32RobotSensor(SensorEntity):
    """Representation of a ESP32 Robot sensor."""

    def __init__(self, host, entry_id):
        """Initialize the sensor."""
        self._host = host
        self._entry_id = entry_id
        
        # Устанавливаем entity_id в формате, который ожидает карточка
        self.entity_id = f"sensor.esp32_robot_status"
        
        # Устанавливаем уникальный ID, который используется для внутреннего хранения
        self._attr_unique_id = f"{DOMAIN}_{host}_status"
        self._attr_name = f"ESP32 Robot Status"
        self._attr_native_value = "diagnostic"
        
        _LOGGER.debug(f"Initialized ESP32RobotSensor: {self._attr_unique_id}")

    @property
    def icon(self):
        """Return the icon."""
        return "mdi:robot"

    @property
    def native_value(self):
        """Return the state of the sensor."""
        return "diagnostic"

    @property
    def extra_state_attributes(self):
        """Return the state attributes."""
        return {
            "host": self._host,
            "entry_id": self._entry_id,
            "diagnostic_mode": True,
            "version": "0.7.4"
        } 