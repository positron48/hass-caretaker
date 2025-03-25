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
    this._config = {
      title: "ESP32 Robot",
      show_toolbar: true,
      show_camera: true,
      camera_fps: 5,
      camera_quality: 80, 
      show_joy: true,
      width: "100%",
      height: "auto",
      use_direct_url: false,
      ...config
    };
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

  // Получаем список сущностей для выбора
  get _entity() {
    return this._config.entity || "";
  }

  // Получаем заголовок карточки
  get _title() {
    return this._config.title || "";
  }

  // Получаем настройки отображения элементов
  get _show_toolbar() {
    return this._config.show_toolbar !== false;
  }

  get _show_camera() {
    return this._config.show_camera !== false;
  }

  get _camera_fps() {
    return this._config.camera_fps || 5;
  }

  get _camera_quality() {
    return this._config.camera_quality || 80;
  }

  get _show_joy() {
    return this._config.show_joy !== false;
  }

  get _width() {
    return this._config.width || "100%";
  }

  get _height() {
    return this._config.height || "auto";
  }
  
  get _use_direct_url() {
    return this._config.use_direct_url === true;
  }

  render() {
    if (!this.hass || !this._entities) {
      return html`<div>Loading...</div>`;
    }

    return html`
      <div class="card-config">
        <div class="config-row">
          <ha-entity-picker
            label="Entity"
            .hass=${this.hass}
            .value=${this._entity}
            .configValue=${"entity"}
            .includeDomains=${["sensor", "binary_sensor"]}
            @change=${this._valueChanged}
            allow-custom-entity
          ></ha-entity-picker>
        </div>

        <div class="config-row">
          <paper-input
            label="Title"
            .value=${this._title}
            .configValue=${"title"}
            @value-changed=${this._valueChanged}
          ></paper-input>
        </div>

        <div class="config-row">
          <p>UI Controls</p>
        </div>

        <div class="config-row">
          <ha-formfield label="Show Toolbar">
            <ha-switch
              .checked=${this._show_toolbar}
              .configValue=${"show_toolbar"}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>
        </div>

        <div class="config-row">
          <ha-formfield label="Show Camera">
            <ha-switch
              .checked=${this._show_camera}
              .configValue=${"show_camera"}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>
        </div>

        <div class="config-row">
          <ha-formfield label="Camera FPS">
            <paper-input
              label="FPS"
              type="number"
              min="1"
              max="30"
              .value=${this._camera_fps}
              .configValue=${"camera_fps"}
              @value-changed=${this._valueChanged}
            ></paper-input>
          </ha-formfield>
        </div>

        <div class="config-row">
          <ha-formfield label="Camera Quality">
            <paper-input
              label="Quality"
              type="number"
              min="1"
              max="100"
              .value=${this._camera_quality}
              .configValue=${"camera_quality"}
              @value-changed=${this._valueChanged}
            ></paper-input>
          </ha-formfield>
        </div>

        <div class="config-row">
          <ha-formfield label="Show Joystick">
            <ha-switch
              .checked=${this._show_joy}
              .configValue=${"show_joy"}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>
        </div>

        <div class="config-row">
          <p>Card Styling</p>
        </div>

        <div class="config-row">
          <paper-input
            label="Width"
            .value=${this._width}
            .configValue=${"width"}
            @value-changed=${this._valueChanged}
          ></paper-input>
        </div>

        <div class="config-row">
          <paper-input
            label="Height"
            .value=${this._height}
            .configValue=${"height"}
            @value-changed=${this._valueChanged}
          ></paper-input>
        </div>
        
        <div class="config-row">
          <p>Advanced Options</p>
        </div>
        
        <div class="config-row">
          <ha-formfield label="Use Direct URL (no auth required)">
            <ha-switch
              .checked=${this._use_direct_url}
              .configValue=${"use_direct_url"}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>
          <div class="note">
            Warning: This disables authentication for robot access.
          </div>
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

// Карточка регистрируется только в основном файле карточки (esp32-robot-card.js)
// Удаляем дублирующую регистрацию здесь 