# ESP32 Robot Integration for Home Assistant

This integration allows you to monitor the status of ESP32 robots in your Home Assistant setup.

## Features

- 🤖 Real-time robot status monitoring (online/offline)
- 📊 Display basic robot metrics

## Installation

1. Copy the `esp32_robot` folder to your Home Assistant `custom_components` directory.
2. Restart Home Assistant.
3. Add the integration through the UI (Configuration > Integrations > Add Integration).

## Configuration

1. Enter the IP address of your ESP32 robot
2. Optionally set a custom name for the robot
3. Optionally adjust the status update interval (in seconds)

## Sensor Information

The integration provides a sensor with the following attributes:

- **State**: Shows whether the robot is "online" or "offline"
- **Attributes**:
  - `ip_address`: The IP address of the robot
  - `direct_url`: Direct URL to access the robot's interface
  - `fps`: Current FPS of the robot's camera (if available)
  - `streaming`: Whether the robot is currently streaming (if available)
  - `last_error`: Last error message (if any)

## Troubleshooting

If you're experiencing issues with the integration:

1. Check that the robot is powered on and connected to your network
2. Verify that the IP address is correct
3. Check the Home Assistant logs for any error messages
4. Try increasing the scan interval if the robot is taking too long to respond 