"""Constants for ESP32 Robot."""

DOMAIN = "esp32_robot"
DEFAULT_NAME = "ESP32 Robot"

# Константы для конфигурации
CONF_HOST = "host" 
CONF_USERNAME = "username"
CONF_PASSWORD = "password"
CONF_IP_ADDRESS = "ip_address"
CONF_NAME = "name"

# Платформы
PLATFORMS = ["sensor", "binary_sensor", "number"]

# Данные в hass.data
DATA_CLIENT = "client"
DATA_ENTITIES = "entities"
PROXY_VIEW = "proxy_view"
PROXY_URL = "proxy_url"
DIRECT_PROXY_URL = "direct_proxy_url"

CONF_SCAN_INTERVAL = "scan_interval"

DEFAULT_SCAN_INTERVAL = 60  # 1 минута в секундах
STATUS_ENDPOINT = "/bt/status"
CONTROL_ENDPOINT = "/control" 