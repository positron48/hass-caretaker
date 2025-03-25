# ESP32 Robot Integration for Home Assistant

This integration allows you to control and monitor your ESP32-CAM robot through Home Assistant.

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

### Открытие веб-интерфейса

Для избежания проблем с iframe внутри Home Assistant, карточка теперь открывает веб-интерфейс ESP32 робота в новой вкладке при нажатии кнопки "Открыть управление".

## Features

- Displays robot status
- Shows Bluetooth information
- Provides a button to open the robot's web interface
- Full-screen modal for controlling your robot 

## Changelog

Полный список изменений в версиях доступен в файле [CHANGELOG.md](../../CHANGELOG.md). 