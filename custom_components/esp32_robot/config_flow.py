"""Config flow for ESP32 Robot integration."""
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_NAME
import homeassistant.helpers.config_validation as cv

from .const import (
    DOMAIN, 
    DEFAULT_NAME, 
    CONF_IP_ADDRESS, 
    CONF_HOST,
    CONF_USERNAME,
    CONF_PASSWORD,
    CONF_SCAN_INTERVAL, 
    DEFAULT_SCAN_INTERVAL
)

class ESP32RobotConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for ESP32 Robot."""
    VERSION = 1
    
    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        errors = {}
        
        if user_input is not None:
            # Обратная совместимость: копируем IP адрес в HOST если это необходимо
            if CONF_IP_ADDRESS in user_input and not user_input.get(CONF_HOST):
                user_input[CONF_HOST] = user_input[CONF_IP_ADDRESS]
                
            # Можно добавить проверку доступности IP
            return self.async_create_entry(
                title=user_input.get(CONF_NAME, DEFAULT_NAME),
                data=user_input,
            )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_HOST): str,
                    vol.Optional(CONF_NAME, default=DEFAULT_NAME): str,
                    vol.Optional(CONF_USERNAME): str,
                    vol.Optional(CONF_PASSWORD): str,
                    vol.Optional(CONF_SCAN_INTERVAL, default=DEFAULT_SCAN_INTERVAL): vol.All(
                        vol.Coerce(int), vol.Range(min=10, max=3600)
                    ),
                }
            ),
            errors=errors,
        ) 