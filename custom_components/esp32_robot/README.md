# ESP32 Robot Integration for Home Assistant

This integration allows you to control and monitor ESP32-based robots through Home Assistant.

## Features

- Secure proxy with token-based authentication
- Custom Lovelace card with iframe interface
- Real-time robot status monitoring
- External access support via token authentication

## Installation

1. Copy the `esp32_robot` folder to your Home Assistant `custom_components` directory.
2. Restart Home Assistant.
3. Add the integration through the UI (Configuration > Integrations > Add Integration).

## Token-Based Authentication

The integration uses long-lived access tokens to secure the proxy endpoint, allowing:

- Secure access to the robot interface via Home Assistant
- External access through the Home Assistant interface
- Authentication without requiring direct robot credentials

### How it works

1. The Lovelace card retrieves the current authentication token from Home Assistant.
2. When opening the iframe, the token is appended to the URL as a query parameter.
3. The proxy server validates the token before forwarding requests to the robot.
4. Token authentication works both from internal HASS UI and external access points.

## Usage

### Adding a Robot

1. Navigate to Configuration > Integrations in Home Assistant.
2. Click "Add Integration" and search for "ESP32 Robot".
3. Enter the IP address of your robot.
4. The integration will create a sensor entity and register the robot with the proxy.

### Using the Lovelace Card

Add the ESP32 Robot card to your dashboard:

```yaml
type: custom:esp32-robot-card
entity: sensor.esp32_robot_status
title: My Robot
```

The card will display the status of your robot and provide a button to open the robot interface in an iframe.

## Security Considerations

- The proxy endpoint is protected by token authentication
- Tokens are automatically managed by Home Assistant
- External requests without a valid token are rejected
- Robot interface is isolated from direct internet access

## Troubleshooting

If you're experiencing issues with the integration:

1. Check that your Home Assistant instance has valid authentication set up
2. Verify that the robot is online and accessible from your Home Assistant instance
3. Check the Home Assistant logs for any authentication or proxy errors
4. Make sure your browser allows iframes and doesn't block cookies

## Development

This integration follows the MVC architecture:
- **Controllers**: Request parsing, validation, response formatting
- **Services**: Business logic and repository interaction
- **Repositories**: Database interaction with minimal business logic

## Proxy Server

Эта интеграция включает встроенный прокси-сервер, который позволяет получить доступ к веб-интерфейсу вашего робота из внешней сети через Home Assistant. Прокси автоматически регистрирует роботов и перенаправляет все запросы.

Это помогает решить проблему, когда:
- Home Assistant доступен из интернета по вашему домену
- Робот доступен только в локальной сети
- Из интернета нет прямого доступа к локальной сети

## Manual Card Setup

Для ручной настройки карточки, добавьте следующие ресурсы JavaScript:

1. Перейдите в "Configuration" -> "Lovelace Dashboards" -> "Resources"
2. Нажмите "+" для добавления нового ресурса
3. Добавьте ресурс:
   - URL: `/esp32_robot/esp32-robot-card.js`
   - Type: JavaScript Module
4. Нажмите "Create"
5. Перезагрузите Home Assistant

## Добавление карточки

### Через интерфейс:

1. Перейдите на панель (dashboard)
2. Нажмите "Edit Dashboard"
3. Нажмите "+" для добавления новой карточки
4. Если карточка не появляется в списке, выберите "Manual" и вставьте:

```yaml
type: 'custom:esp32-robot-card'
entity: sensor.esp32_robot_status
title: 'ESP32 Robot'
```

### Работа с iframe

Карточка теперь использует прокси-URL для отображения веб-интерфейса робота внутри Home Assistant. Это позволяет управлять роботом даже при доступе к Home Assistant из внешней сети.

## Features

- Displays robot status
- Shows Bluetooth information
- Provides a button to open the robot's web interface
- Full-screen modal for controlling your robot 
- Proxy server for external access

## Changelog

Полный список изменений в версиях доступен в файле [CHANGELOG.md](../../CHANGELOG.md). 