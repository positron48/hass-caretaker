"""Config flow for ESP32 Robot integration."""
import ipaddress
import logging
import voluptuous as vol
import aiohttp
import async_timeout

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.const import CONF_NAME

from .const import DOMAIN, CONF_IP_ADDRESS, CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL

_LOGGER = logging.getLogger(__name__)

DATA_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_IP_ADDRESS): str,
        vol.Optional(CONF_UPDATE_INTERVAL, default=DEFAULT_UPDATE_INTERVAL): int,
    }
)


class ESP32RobotConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for ESP32 Robot."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        errors = {}

        if user_input is not None:
            try:
                # Validate IP address format
                ip_str = user_input[CONF_IP_ADDRESS]
                try:
                    ipaddress.ip_address(ip_str)
                except ValueError:
                    errors["base"] = "invalid_ip"

                # Validate update interval (must be positive)
                if user_input.get(CONF_UPDATE_INTERVAL, 0) < 5:
                    errors["base"] = "invalid_interval"

                # Test connection if IP is valid
                if not errors:
                    try:
                        session = async_get_clientsession(self.hass)
                        async with async_timeout.timeout(10):
                            # Try to reach the robot status endpoint
                            url = f"http://{ip_str}/status"
                            async with session.get(url) as response:
                                if response.status != 200:
                                    errors["base"] = "cannot_connect"
                    except (aiohttp.ClientError, TimeoutError):
                        errors["base"] = "cannot_connect"

                # Create entry if validated
                if not errors:
                    await self.async_set_unique_id(f"esp32_robot_{ip_str.replace('.', '_')}")
                    self._abort_if_unique_id_configured()
                    
                    return self.async_create_entry(
                        title=f"ESP32 Robot {ip_str}",
                        data=user_input,
                    )

            except Exception as e:
                _LOGGER.exception("Unexpected exception during configuration")
                errors["base"] = "unknown"

        return self.async_show_form(
            step_id="user", data_schema=DATA_SCHEMA, errors=errors
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Get options flow for this handler."""
        return OptionsFlowHandler(config_entry)


class OptionsFlowHandler(config_entries.OptionsFlow):
    """Handle options flow for ESP32 Robot."""

    def __init__(self, config_entry):
        """Initialize options flow."""
        self.config_entry = config_entry

    async def async_step_init(self, user_input=None):
        """Manage options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        options = {
            vol.Optional(
                CONF_UPDATE_INTERVAL,
                default=self.config_entry.options.get(
                    CONF_UPDATE_INTERVAL, 
                    self.config_entry.data.get(CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL)
                ),
            ): int,
        }

        return self.async_show_form(step_id="init", data_schema=vol.Schema(options)) 