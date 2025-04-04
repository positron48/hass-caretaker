"""
Test script for the ESP32 Robot signed URL authentication.

This script simulates requests to verify that the signed URL authentication works correctly.
To run this script, you need to be in the Home Assistant environment.

Usage:
  python3 -m custom_components.esp32_robot.test_signed_url
"""

import asyncio
import logging
import aiohttp
from urllib.parse import urlparse, parse_qs

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
_LOGGER = logging.getLogger(__name__)

async def test_signed_url_flow():
    """Test the full signed URL authentication flow."""
    # This should be replaced with a valid Home Assistant long-lived access token
    ha_token = "YOUR_LONG_LIVED_TOKEN"
    
    # Base URL of your Home Assistant instance
    base_url = "http://localhost:8123"  # Change this to your HA URL
    
    # Sensor ID of your ESP32 Robot
    robot_id = "YOUR_ROBOT_ID"  # Change this to your robot ID
    
    _LOGGER.info("Starting signed URL flow test")
    
    try:
        async with aiohttp.ClientSession() as session:
            # 1. Request a signed URL
            _LOGGER.info("Requesting signed URL...")
            headers = {"Authorization": f"Bearer {ha_token}"}
            
            async with session.get(
                f"{base_url}/api/esp32_robot/get_signed_url?id={robot_id}",
                headers=headers
            ) as response:
                if response.status != 200:
                    _LOGGER.error(f"Failed to get signed URL: {response.status}")
                    text = await response.text()
                    _LOGGER.error(f"Response: {text}")
                    return
                
                data = await response.json()
                signed_url = data["signed_url"]
                _LOGGER.info(f"Received signed URL: {signed_url}")
                
                # Parse the URL to extract parameters
                parsed_url = urlparse(signed_url)
                query_params = parse_qs(parsed_url.query)
                
                # Check if the URL contains an auth_sig parameter
                if "authSig" not in query_params:
                    _LOGGER.error("The signed URL does not contain an authSig parameter")
                    return
                
                _LOGGER.info("URL appears to be correctly signed")
            
            # 2. Test accessing the stream with the signed URL (no auth header)
            _LOGGER.info("Testing access to stream with signed URL (no auth)...")
            
            try:
                # Just check if we get a valid response header - don't stream the whole content
                async with session.get(
                    f"{base_url}{signed_url}",
                    headers={},  # No auth header
                    timeout=5
                ) as response:
                    if response.status == 200:
                        content_type = response.headers.get("Content-Type", "")
                        if "multipart/x-mixed-replace" in content_type:
                            _LOGGER.info("Successfully accessed stream with signed URL")
                        else:
                            _LOGGER.warning(f"Received 200 response, but content type is {content_type}")
                    else:
                        _LOGGER.error(f"Failed to access stream with signed URL: {response.status}")
                        text = await response.text()
                        _LOGGER.error(f"Response: {text}")
            except asyncio.TimeoutError:
                # For MJPEG streams, a timeout is expected since we're not consuming the full stream
                _LOGGER.info("Request timed out as expected for MJPEG stream")
            
            # 3. Test accessing the stream without signed URL or auth (should fail)
            _LOGGER.info("Testing access to stream without signed URL or auth (should fail)...")
            
            try:
                # Test direct access to the stream endpoint
                async with session.get(
                    f"{base_url}/api/esp32_robot/proxy/{robot_id}/stream",
                    headers={},  # No auth header
                    timeout=5
                ) as response:
                    if response.status == 401:
                        _LOGGER.info("Correctly received 401 Unauthorized when accessing without auth")
                    else:
                        _LOGGER.error(f"Unexpected status code: {response.status} (expected 401)")
                        text = await response.text()
                        _LOGGER.error(f"Response: {text}")
            except asyncio.TimeoutError:
                _LOGGER.error("Request timed out, which is unexpected for auth failure")
    
    except Exception as e:
        _LOGGER.error(f"Test failed with exception: {str(e)}")
    
    _LOGGER.info("Signed URL flow test completed")

if __name__ == "__main__":
    # Run the test
    asyncio.run(test_signed_url_flow()) 