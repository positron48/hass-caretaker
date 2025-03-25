# ESP32 Robot Integration for Home Assistant

This integration allows you to control and monitor your ESP32-CAM robot through Home Assistant.

## Manual Card Setup (if card doesn't appear automatically)

If the ESP32 Robot Card doesn't appear in your list of available cards, you may need to add the JavaScript resources manually:

1. Go to "Configuration" -> "Lovelace Dashboards"
2. Click on "Resources" tab
3. Click the "+" button to add a new resource
4. Add the following resources:
   - URL: `/esp32_robot/esp32-robot-card.js`, Type: JavaScript Module
   - URL: `/esp32_robot/editor.js`, Type: JavaScript Module
5. Restart Home Assistant

## Adding the Card to Dashboard

1. Go to any dashboard you want to add the card to
2. Click "Edit Dashboard"
3. Click "+" to add a new card
4. Scroll down to "Manual" 
5. Enter the following YAML:

```yaml
type: 'custom:esp32-robot-card'
entity: sensor.esp32_robot_status
title: 'My ESP32 Robot' # Optional
```

6. Click "Save"

## Features

- Displays robot status
- Shows Bluetooth information
- Provides a button to open the robot's web interface
- Full-screen modal for controlling your robot 