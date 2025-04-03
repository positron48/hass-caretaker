"""The ESP32 Robot integration."""
import logging
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN, CONF_IP_ADDRESS
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
    
    # Сохраняем данные entry
    hass.data[DOMAIN][entry.entry_id] = entry.data
    
    # Настраиваем сенсор
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id)
    
    return unload_ok 