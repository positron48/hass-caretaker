"""Constants for ESP32 Robot integration."""
DOMAIN = "esp32_robot"
DEFAULT_NAME = "ESP32 Robot"

CONF_IP_ADDRESS = "ip_address"
CONF_SCAN_INTERVAL = "scan_interval"

DEFAULT_SCAN_INTERVAL = 60  # 1 минута в секундах
STATUS_ENDPOINT = "/bt/status" 