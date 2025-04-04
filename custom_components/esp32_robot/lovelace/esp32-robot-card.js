import { LitElement, html, css } from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class ESP32RobotCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object }
    };
  }

  constructor() {
    super();
  }

  static get styles() {
    return css`
      .card-container {
        padding: 16px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .header h2 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 500;
      }
      .status {
        display: flex;
        flex-direction: column;
        margin-bottom: 16px;
      }
      .status-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
      }
      .status-label {
        font-weight: 500;
        color: var(--primary-text-color);
      }
      .status-value {
        color: var(--secondary-text-color);
      }
      .status-value.online {
        color: var(--success-color, #4CAF50);
      }
      .status-value.offline {
        color: var(--error-color, #F44336);
      }
    `;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    this.config = config;
  }

  static getConfigElement() {
    return document.createElement("esp32-robot-card-editor");
  }

  static getStubConfig() {
    return {
      entity: "sensor.esp32_robot_status",
      title: "ESP32 Robot"
    };
  }

  getCardSize() {
    return 3;
  }

  render() {
    if (!this.config || !this.hass) {
      return html``;
    }

    const entityId = this.config.entity;
    const stateObj = this.hass.states[entityId];
    
    if (!stateObj) {
      return html`
        <ha-card>
          <div class="card-container">
            <div class="header">
              <h2>ESP32 Robot</h2>
            </div>
            <div class="error">
              Entity not found: ${entityId}
            </div>
          </div>
        </ha-card>
      `;
    }

    const status = stateObj.state;
    const ipAddress = stateObj.attributes.ip_address || "";
    const fps = stateObj.attributes.fps || 0;
    const streaming = stateObj.attributes.streaming || false;
    
    // Показываем ошибку только если статус онлайн и есть сообщение об ошибке
    const lastError = status === 'online' ? (stateObj.attributes.last_error || "") : "";
    
    return html`
      <ha-card>
        <div class="card-container">
          <div class="header">
            <h2>${this.config.title || "ESP32 Robot"}</h2>
            <ha-icon
              icon="${status === 'online' ? 'mdi:robot' : 'mdi:robot-off'}"
              style="color: ${status === 'online' ? 'var(--success-color, #4CAF50)' : 'var(--error-color, #F44336)'}"
            ></ha-icon>
          </div>
          
          <div class="status">
            <div class="status-row">
              <span class="status-label">Статус:</span>
              <span class="status-value ${status}">${status === 'online' ? 'онлайн' : 'оффлайн'}</span>
            </div>
            
            ${status === 'online' ? html`
              <div class="status-row">
                <span class="status-label">IP адрес:</span>
                <span class="status-value">${ipAddress}</span>
              </div>
              
              <div class="status-row">
                <span class="status-label">Стриминг:</span>
                <span class="status-value">${streaming ? 'активен' : 'не активен'}</span>
              </div>
              
              ${streaming ? html`
                <div class="status-row">
                  <span class="status-label">FPS:</span>
                  <span class="status-value">${fps}</span>
                </div>
              ` : ''}
            ` : ''}
            
            ${lastError ? html`
              <div class="status-row">
                <span class="status-label">Ошибка:</span>
                <span class="status-value" style="color: var(--error-color, #F44336)">${lastError}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </ha-card>
    `;
  }
}

customElements.define("esp32-robot-card", ESP32RobotCard);

// Для HACS и регистрации карточки
window.customCards = window.customCards || [];
window.customCards.push({
  type: "esp32-robot-card",
  name: "ESP32 Robot Card",
  description: "A card for displaying the ESP32 Robot status",
}); 
