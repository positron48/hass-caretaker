import { LitElement, html, css } from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class ESP32RobotCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
      _entities: { type: Array }
    };
  }

  setConfig(config) {
    this._config = { ...config };
  }

  firstUpdated() {
    this._fetchEntities();
  }

  _fetchEntities() {
    if (!this.hass) return;
    
    this._entities = Object.keys(this.hass.states)
      .filter(entityId => entityId.startsWith('sensor.') && 
              this.hass.states[entityId].attributes && 
              this.hass.states[entityId].attributes.iframe_url)
      .map(entityId => ({
        id: entityId,
        name: this.hass.states[entityId].attributes.friendly_name || entityId
      }));
  }

  _valueChanged(event) {
    if (!this._config || !this.hass) return;
    
    const target = event.target;
    const value = target.value;
    const configValue = target.configValue;
    
    if (!configValue) return;
    
    this._config = {
      ...this._config,
      [configValue]: value
    };

    // Отправляем событие об изменении конфигурации
    const configChangeEvent = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(configChangeEvent);
  }

  render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    if (!this._entities) {
      this._fetchEntities();
    }

    return html`
      <div class="card-config">
        <div class="field">
          <ha-textfield
            label="Заголовок (опционально)"
            .value="${this._config.title || ''}"
            .configValue=${"title"}
            @input="${this._valueChanged}"
          ></ha-textfield>
        </div>
        
        <div class="field">
          <ha-select
            label="Сенсор ESP32 Robot"
            .configValue=${"entity"}
            .value="${this._config.entity || ''}"
            @change="${this._valueChanged}"
            required
          >
            ${this._entities && this._entities.map(entity => html`
              <mwc-list-item .value="${entity.id}">${entity.name}</mwc-list-item>
            `)}
          </ha-select>
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      .field {
        margin-bottom: 16px;
      }
      ha-textfield, ha-select {
        width: 100%;
      }
      mwc-list-item {
        width: 100%;
      }
    `;
  }
}

customElements.define("esp32-robot-card-editor", ESP32RobotCardEditor);

// Обратная совместимость для HACS
window.customCards = window.customCards || [];
window.customCards.push({
  type: "esp32-robot-card",
  name: "ESP32 Robot Card",
  description: "A card for controlling the ESP32 Robot",
  preview: false
}); 