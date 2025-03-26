# ESP32 Robot Integration for Home Assistant

This integration allows you to control and monitor your ESP32-CAM robot through Home Assistant.

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