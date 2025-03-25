# ESP32 Robot - Home Assistant Integration

This integration allows you to control and monitor your ESP32-CAM robot through Home Assistant.

## Features

- Displays status of your robot
- Provides iframe to access robot's web interface
- Monitors robot availability and bluetooth status
- Configurable status check interval
- Custom Lovelace card with status display and robot control interface

## Installation

### HACS (Recommended)

1. Add this repository as a custom repository in HACS:
   - Go to HACS in your Home Assistant instance
   - Click on "Integrations"
   - Click the three dots in the top right corner and select "Custom repositories"
   - Add the URL of this repository and select "Integration" as the category
   - Click "Add"

2. Search for "ESP32 Robot" in HACS and install it

3. Restart Home Assistant

### Manual Installation

1. Copy the `custom_components/esp32_robot` directory to your Home Assistant's `custom_components` directory
2. Restart Home Assistant

## Configuration

1. Go to "Configuration" -> "Integrations" in Home Assistant
2. Click the "+" button to add a new integration
3. Search for "ESP32 Robot" and select it
4. Enter the following details:
   - IP address: The IP address of your ESP32 robot
   - Name (optional): Custom name for your robot
   - Scan interval (optional): How often to check robot status in seconds (default: 60)
5. Click "Submit"

## API Endpoints

The integration uses these API endpoints:

- Status check: `http://<ip_address>/bt/status`

## Usage

### Sensor Entity

After setup, a sensor entity will be created showing your robot's status. This sensor includes attributes such as:

- IP address
- Iframe URL
- Bluetooth status
- Bluetooth connection status

### Custom Lovelace Card

A custom Lovelace card is automatically registered with this integration. To add it to your dashboard:

1. Go to your dashboard
2. Click the "Edit Dashboard" button
3. Click the "+" button to add a new card
4. Find "ESP32 Robot Card" in the list of cards
5. Configure the card:
   - Select the ESP32 Robot sensor entity
   - Set an optional title
6. Click "Save"

If the card doesn't appear in the list:
1. Go to "Configuration" -> "Lovelace Dashboards" -> "Resources"
2. Verify that `/esp32_robot/esp32-robot-card.js` is in the list
3. If not, restart Home Assistant or add it manually

## License

This project is licensed under the MIT License - see the LICENSE file for details. 