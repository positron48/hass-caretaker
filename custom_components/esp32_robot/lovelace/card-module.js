import { ESP32RobotCard } from './esp32-robot-card.js';
import { ESP32RobotCardEditor } from './editor.js';

// Debugging - log when module is loaded
console.log("ESP32 Robot card module loaded");

// Убедимся, что элементы правильно определены
window.customElements.define("esp32-robot-card", ESP32RobotCard);
window.customElements.define("esp32-robot-card-editor", ESP32RobotCardEditor);

// Регистрация карточки для использования в Lovelace
window.customCards = window.customCards || [];
window.customCards.push({
  type: "esp32-robot-card",
  name: "ESP32 Robot Card",
  description: "A card to monitor and control an ESP32 Robot"
});

// Debug - log the current customCards array
console.log("Current customCards:", window.customCards); 