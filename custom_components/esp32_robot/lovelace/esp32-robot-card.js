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
    this.attachShadow({ mode: 'open' });
    this._config = {};
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

  set hass(hass) {
    this._hass = hass;
    this._entity = this._config.entity ? hass.states[this._config.entity] : null;
    this._render();
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('You need to define an entity');
    }
    this._config = config;
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

  _render() {
    if (!this._entity) {
      this.shadowRoot.innerHTML = `
        <ha-card header="ESP32 Robot">
          <div class="card-content">
            <div>Entity not found: ${this._config.entity}</div>
          </div>
        </ha-card>
      `;
      return;
    }

    const isOnline = this._entity.state === 'online';
    const statusColor = isOnline ? 'var(--success-color, #4CAF50)' : 'var(--error-color, #F44336)';
    const status = isOnline ? 'Online' : 'Offline';
    const ipAddress = this._entity.attributes.ip_address || '';
    const fps = this._entity.attributes.fps !== undefined ? this._entity.attributes.fps : '';
    const streaming = this._entity.attributes.streaming !== undefined ? this._entity.attributes.streaming : '';
    const entityId = this._entity.entity_id.split(".")[1];

    this.shadowRoot.innerHTML = `
      <ha-card header="${this._config.title || 'ESP32 Robot'}">
        <style>
          .card-content {
            padding: 16px;
          }
          .status {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
          }
          .status-icon {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: ${statusColor};
            margin-right: 8px;
          }
          .attributes {
            margin-top: 16px;
          }
          .attribute {
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
          }
          .control-btn {
            --mdc-theme-primary: var(--primary-color);
            margin-top: 16px;
            width: 100%;
            ${!isOnline ? 'opacity: 0.5; pointer-events: none;' : ''}
          }
          .error {
            color: var(--error-color);
            margin-top: 8px;
          }
        </style>
        <div class="card-content">
          <div class="status">
            <div class="status-icon"></div>
            <div>${status}</div>
          </div>
          
          <div class="attributes">
            <div class="attribute">
              <div>IP:</div>
              <div>${ipAddress}</div>
            </div>
            ${isOnline && fps ? `
              <div class="attribute">
                <div>FPS:</div>
                <div>${fps}</div>
              </div>
            ` : ''}
            ${isOnline && streaming !== undefined ? `
              <div class="attribute">
                <div>Streaming:</div>
                <div>${streaming ? 'Yes' : 'No'}</div>
              </div>
            ` : ''}
            ${isOnline && this._entity.attributes.last_error ? `
              <div class="error">
                ${this._entity.attributes.last_error}
              </div>
            ` : ''}
          </div>
          
          <mwc-button 
            class="control-btn" 
            raised 
            ?disabled="${!isOnline}" 
            @click="${this._openControlInterface}"
          >
            Control Interface
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  _openControlInterface() {
    if (!this._entity || this._entity.state !== 'online') {
      return;
    }

    const entityId = this._entity.entity_id.split(".")[1];
    const title = this._config.title || 'ESP32 Robot';

    // Create a modal dialog
    const dialog = document.createElement('dialog');
    dialog.id = `esp32-robot-dialog-${entityId}`;
    dialog.style.position = 'fixed';
    dialog.style.top = '0';
    dialog.style.left = '0';
    dialog.style.width = '100%';
    dialog.style.height = '100%';
    dialog.style.padding = '0';
    dialog.style.border = 'none';
    dialog.style.zIndex = '9999';
    dialog.style.backgroundColor = '#000';
    dialog.style.overflow = 'hidden';

    // Create an iframe that will load the robot control interface
    const iframe = document.createElement('iframe');
    iframe.src = `/frontend_es5/esp32_robot_interface.html?entity_id=${entityId}`;
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';

    // Create a close button
    const closeButton = document.createElement('div');
    closeButton.style.position = 'absolute';
    closeButton.style.top = '16px';
    closeButton.style.right = '16px';
    closeButton.style.zIndex = '10000';
    closeButton.style.background = 'rgba(0, 0, 0, 0.5)';
    closeButton.style.color = 'white';
    closeButton.style.padding = '8px 12px';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.fontSize = '16px';
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => {
      dialog.close();
      document.body.removeChild(dialog);
    });

    // Add elements to the dialog
    dialog.appendChild(iframe);
    dialog.appendChild(closeButton);

    // Add dialog to the document
    document.body.appendChild(dialog);
    
    // Show the dialog
    dialog.showModal();
  }
}

customElements.define("esp32-robot-card", ESP32RobotCard);

// Для HACS и регистрации карточки
window.customCards = window.customCards || [];
window.customCards.push({
  type: "esp32-robot-card",
  name: "ESP32 Robot Card",
  description: "A card to monitor and control an ESP32 Robot",
}); 
