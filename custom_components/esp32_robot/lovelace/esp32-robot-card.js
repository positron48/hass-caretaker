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
      .action-button {
        background-color: var(--primary-color);
        color: var(--text-primary-color);
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        font-size: 14px;
        cursor: pointer;
        width: 100%;
        transition: background-color 0.3s;
      }
      .action-button:hover {
        background-color: var(--dark-primary-color);
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

  _openInNewTab() {
    const entityId = this.config.entity;
    const stateObj = this.hass.states[entityId];
    
    if (!stateObj) {
      return;
    }
    
    const iframeUrl = stateObj.attributes.iframe_url;
    
    // Открываем в новом окне
    if (iframeUrl) {
      window.open(iframeUrl, '_blank', 'noreferrer,noopener');
    }
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
    const btEnabled = stateObj.attributes.bt_enabled || false;
    const btConnected = stateObj.attributes.bt_connected || false;
    const btStatus = stateObj.attributes.bt_status || "Неизвестно";
    const ipAddress = stateObj.attributes.ip_address || "";
    
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
                <span class="status-label">Bluetooth:</span>
                <span class="status-value">${btEnabled ? 'активирован' : 'не активирован'}</span>
              </div>
              
              ${btEnabled ? html`
                <div class="status-row">
                  <span class="status-label">Подключение:</span>
                  <span class="status-value">${btConnected ? 'подключен' : 'не подключен'}</span>
                </div>
                
                <div class="status-row">
                  <span class="status-label">Статус BT:</span>
                  <span class="status-value">${btStatus}</span>
                </div>
              ` : ''}
              
              <div class="status-row">
                <span class="status-label">IP адрес:</span>
                <span class="status-value">${ipAddress}</span>
              </div>
            ` : ''}
          </div>
          
          <button 
            class="action-button" 
            @click="${this._openInNewTab}"
            ?disabled="${status !== 'online'}"
          >
            ${status === 'online' ? 'Открыть управление' : 'Робот недоступен'}
          </button>
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
  description: "A card for controlling the ESP32 Robot",
}); 