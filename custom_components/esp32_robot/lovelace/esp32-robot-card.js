import { LitElement, html, css } from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class ESP32RobotCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      iframeOpened: { type: Boolean },
      iframeUrl: { type: String },
    };
  }

  constructor() {
    super();
    this.iframeOpened = false;
    this.iframeUrl = "";
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
      .iframe-container {
        height: 0;
        overflow: hidden;
        transition: height 0.3s ease;
      }
      .iframe-container.opened {
        height: 600px;
        margin-top: 16px;
      }
      iframe {
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 4px;
      }
      .iframe-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.6);
        z-index: 999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .iframe-modal {
        width: 90vw;
        height: 90vh;
        max-width: 1200px;
        background-color: var(--card-background-color);
        border-radius: 8px;
        overflow: hidden;
        position: relative;
      }
      .iframe-modal iframe {
        width: 100%;
        height: 100%;
        border: none;
      }
      .close-button {
        position: absolute;
        top: 8px;
        right: 8px;
        background-color: var(--primary-color);
        color: var(--text-primary-color);
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1;
      }
    `;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    this.config = config;
  }

  getCardSize() {
    return 3;
  }

  _toggleIframe() {
    const entityId = this.config.entity;
    const stateObj = this.hass.states[entityId];
    
    if (!stateObj) {
      return;
    }
    
    this.iframeUrl = stateObj.attributes.iframe_url;
    this.iframeOpened = !this.iframeOpened;
    
    // Если iframe открыт и мы закрываем его - очищаем URL
    if (!this.iframeOpened) {
      setTimeout(() => {
        this.iframeUrl = "";
      }, 300);
    }
  }

  _callService(service, data = {}) {
    const [domain, service_name] = service.split(".");
    this.hass.callService(domain, service_name, data);
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
            @click="${this._toggleIframe}"
            ?disabled="${status !== 'online'}"
          >
            ${status === 'online' ? (this.iframeOpened ? 'Закрыть управление' : 'Открыть управление') : 'Робот недоступен'}
          </button>
        </div>
      </ha-card>
      
      ${this.iframeOpened && this.iframeUrl ? html`
        <div class="iframe-overlay" @click="${(e) => e.target === e.currentTarget && this._toggleIframe()}">
          <div class="iframe-modal">
            <button class="close-button" @click="${this._toggleIframe}">
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
            <iframe src="${this.iframeUrl}" allow="fullscreen"></iframe>
          </div>
        </div>
      ` : ''}
    `;
  }
}

customElements.define("esp32-robot-card", ESP32RobotCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "esp32-robot-card",
  name: "ESP32 Robot Card",
  description: "A card for controlling the ESP32 Robot",
}); 