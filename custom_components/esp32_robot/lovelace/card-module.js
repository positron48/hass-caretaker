import { ESP32RobotCard } from './esp32-robot-card.js';
import { ESP32RobotCardEditor } from './editor.js';

customElements.define("esp32-robot-card", ESP32RobotCard);
customElements.define("esp32-robot-card-editor", ESP32RobotCardEditor);

// Register card for HACS
window.customCards = window.customCards || [];
window.customCards.push({
  type: "esp32-robot-card",
  name: "ESP32 Robot Card",
  description: "A card to monitor and control an ESP32 Robot",
}); 