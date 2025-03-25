"""Sensor platform for ESP32 Robot."""
import logging
import asyncio
import aiohttp
import hashlib
from datetime import timedelta

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import (
    DOMAIN, 
    CONF_IP_ADDRESS, 
    CONF_HOST,
    CONF_SCAN_INTERVAL, 
    DEFAULT_SCAN_INTERVAL, 
    DATA_CLIENT,
    PROXY_URL,
    DIRECT_PROXY_URL
)

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    """Set up ESP32 Robot sensor based on a config entry."""
    # Получаем клиент API из данных компонента
    if entry.entry_id not in hass.data[DOMAIN]:
        _LOGGER.error(f"Entry {entry.entry_id} not found in {DOMAIN} data")
        return
        
    entry_data = hass.data[DOMAIN][entry.entry_id]
    api_client = entry_data.get(DATA_CLIENT)
    if not api_client:
        _LOGGER.error("API client not found")
        return
        
    scan_interval = entry.data.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL)
    
    # Получаем URL для прокси
    proxy_url = entry_data.get(PROXY_URL)
    direct_proxy_url = entry_data.get(DIRECT_PROXY_URL)
    
    # Создаем координатор для обновления данных
    coordinator = ESP32RobotCoordinator(hass, api_client, scan_interval)
    await coordinator.async_config_entry_first_refresh()
    
    async_add_entities([ESP32RobotSensor(coordinator, entry, proxy_url, direct_proxy_url)])

class ESP32RobotCoordinator(DataUpdateCoordinator):
    """Class to manage fetching ESP32 Robot data."""

    def __init__(self, hass, api_client, scan_interval):
        """Initialize."""
        self.api_client = api_client
        self.hass = hass
        
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
            return await self.api_client.get_status(self.hass)
        except (aiohttp.ClientError, asyncio.TimeoutError) as err:
            raise UpdateFailed(f"Error communicating with API: {err}")
        except Exception as err:
            raise UpdateFailed(f"Unknown error: {err}")

class ESP32RobotSensor(SensorEntity):
    """Representation of a ESP32 Robot sensor."""

    def __init__(self, coordinator, entry, proxy_url=None, direct_proxy_url=None):
        """Initialize the sensor."""
        self.coordinator = coordinator
        self._entry = entry
        self._host = entry.data.get(CONF_HOST) or entry.data.get(CONF_IP_ADDRESS)
        self._proxy_url = proxy_url
        self._direct_proxy_url = direct_proxy_url
        self._attr_unique_id = f"{DOMAIN}_{self._host}_status"
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
            "host": self._host,
        }
        
        # Добавляем прокси URL
        if self._proxy_url:
            attrs["proxy_url"] = self._proxy_url
            
        # Добавляем прямой прокси URL (без авторизации)
        if self._direct_proxy_url:
            attrs["direct_proxy_url"] = self._direct_proxy_url
            
        # Добавляем прямой URL к роботу
        attrs["direct_url"] = f"http://{self._host}/"
            
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