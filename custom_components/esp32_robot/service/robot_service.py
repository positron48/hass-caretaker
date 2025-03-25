"""Service for ESP32 Robot."""
import logging
from ..controller.robot_controller import RobotController

_LOGGER = logging.getLogger(__name__)

class RobotService:
    """Service for ESP32 Robot business logic."""
    
    def __init__(self, hass, ip_address):
        """Initialize the service."""
        self.hass = hass
        self.ip_address = ip_address
        self.controller = RobotController(hass, ip_address)
        
    async def check_status(self):
        """Check robot status and handle business logic."""
        status_data = await self.controller.get_status()
        
        # Здесь может быть дополнительная бизнес-логика
        # например, обработка статуса и запуск событий
        
        return status_data 