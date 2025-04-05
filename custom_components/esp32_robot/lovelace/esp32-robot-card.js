import { LitElement, html, css } from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// Add global styles for the dialog popup
const popupStyles = document.createElement('style');
popupStyles.textContent = `
  .esp32-robot-dialog {
    --popup-bg-color: var(--primary-background-color, #111);
    --popup-text-color: var(--primary-text-color, #fff);
    --popup-border-radius: var(--ha-card-border-radius, 4px);
  }
  .esp32-robot-dialog::backdrop {
    background-color: rgba(0, 0, 0, 0.7);
  }
  .ha-button {
    transition: all 0.2s ease-in-out;
  }
  .ha-button:hover {
    opacity: 0.9;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .ha-button:active {
    transform: translateY(1px);
  }
`;
document.head.appendChild(popupStyles);

class ESP32RobotCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object }
    };
  }

  constructor() {
    super();
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
      }
      .error {
        color: var(--error-color);
        margin-top: 8px;
      }
    `;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('You need to define an entity');
    }
    this._config = config;
  }

  set hass(hass) {
    this._hass = hass;
    this._entity = this._config.entity ? hass.states[this._config.entity] : null;
    this.requestUpdate();
  }

  static getConfigElement() {
    return document.createElement("esp32-robot-card-editor");
  }

  static getStubConfig(hass) {
    // Попытаемся найти подходящую сущность для карточки
    const entities = Object.keys(hass.states)
      .filter(entityId => entityId.startsWith('sensor.esp32_robot') || 
              (entityId.startsWith('sensor.') && 
               hass.states[entityId].attributes.direct_url !== undefined));
    
    const entity = entities.length > 0 ? entities[0] : "";
    
    return {
      entity: entity,
      title: entity ? hass.states[entity].attributes.friendly_name || "ESP32 Robot" : "ESP32 Robot"
    };
  }

  getCardSize() {
    return 3;
  }

  render() {
    if (!this._entity) {
      return html`
        <ha-card header="ESP32 Robot">
          <div class="card-content">
            <div>Entity not found: ${this._config.entity}</div>
          </div>
        </ha-card>
      `;
    }

    const isOnline = this._entity.state === 'online';
    const statusColor = isOnline ? 'var(--success-color, #4CAF50)' : 'var(--error-color, #F44336)';
    const status = isOnline ? 'Online' : 'Offline';
    const ipAddress = this._entity.attributes.ip_address || '';

    return html`
      <ha-card header="${this._config.title || 'ESP32 Robot'}">
        <div class="card-content">
          <div class="status">
            <div class="status-icon" style="background-color: ${statusColor}"></div>
            <div>${status}</div>
          </div>
          
          <div class="attributes">
            <div class="attribute">
              <div>IP:</div>
              <div>${ipAddress}</div>
            </div>
            ${isOnline && this._entity.attributes.last_error ? html`
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

    // Create a modal dialog with full black background
    const dialog = document.createElement('dialog');
    dialog.id = `esp32-robot-dialog-${entityId}`;
    dialog.className = 'esp32-robot-dialog';
    dialog.style.position = 'fixed';
    dialog.style.top = '0';
    dialog.style.left = '0';
    dialog.style.width = '100vw'; // Use viewport width to ensure full width
    dialog.style.height = '100vh'; // Use viewport height to ensure full height
    dialog.style.maxWidth = '100vw'; // Prevent default max-width restrictions
    dialog.style.maxHeight = '100vh'; // Prevent default max-height restrictions
    dialog.style.padding = '0';
    dialog.style.margin = '0';
    dialog.style.border = 'none';
    dialog.style.zIndex = '9999';
    dialog.style.backgroundColor = '#000'; // Pure black background
    dialog.style.color = 'var(--primary-text-color, #fff)';
    dialog.style.overflow = 'hidden'; // Prevent scrolling
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';
    dialog.style.boxSizing = 'border-box'; // Ensure padding doesn't affect size

    // Container with overlay structure like in original design
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.overflow = 'hidden';

    // Video container takes full space
    const videoContainer = document.createElement('div');
    videoContainer.style.position = 'absolute';
    videoContainer.style.top = '0';
    videoContainer.style.left = '0';
    videoContainer.style.width = '100%';
    videoContainer.style.height = '100%';
    videoContainer.style.zIndex = '1';
    videoContainer.style.backgroundColor = '#000';
    
    // Loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.textContent = 'Click Start Stream button';
    loadingEl.style.position = 'absolute';
    loadingEl.style.color = 'var(--primary-text-color, #fff)';
    loadingEl.style.display = 'flex';
    loadingEl.style.alignItems = 'center';
    loadingEl.style.justifyContent = 'center';
    loadingEl.style.width = '100%';
    loadingEl.style.height = '100%';
    loadingEl.style.textAlign = 'center';
    loadingEl.style.fontWeight = 'bold';
    loadingEl.style.padding = '16px';
    loadingEl.style.boxSizing = 'border-box';
    loadingEl.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    loadingEl.id = 'loading-indicator';
    videoContainer.appendChild(loadingEl);

    // Video element
    const videoImg = document.createElement('img');
    videoImg.style.width = '100%';
    videoImg.style.height = '100%';
    videoImg.style.objectFit = 'contain';
    videoImg.style.display = 'none';
    videoImg.id = 'video-stream';
    videoContainer.appendChild(videoImg);

    // Controls overlay (positioned over the video)
    const controlsOverlay = document.createElement('div');
    controlsOverlay.style.position = 'absolute';
    controlsOverlay.style.zIndex = '2';
    controlsOverlay.style.width = '100%';
    controlsOverlay.style.height = '100%';
    controlsOverlay.style.pointerEvents = 'none'; // Allow clicks to pass through by default

    // Top controls section
    const controlsTop = document.createElement('div');
    controlsTop.style.position = 'absolute';
    controlsTop.style.top = '20px';
    controlsTop.style.left = '20px';
    controlsTop.style.display = 'flex';
    controlsTop.style.alignItems = 'center';
    controlsTop.style.gap = '16px';
    controlsTop.style.pointerEvents = 'all'; // This section captures clicks
    controlsTop.style.background = 'rgba(0, 0, 0, 0.5)';
    controlsTop.style.padding = '8px';
    controlsTop.style.borderRadius = '8px';
    controlsTop.style.backdropFilter = 'blur(5px)';

    // Stream toggle button
    const streamToggle = document.createElement('button');
    streamToggle.className = 'button icon-button';
    streamToggle.title = 'Start/Stop Stream';
    streamToggle.style.padding = '10px';
    streamToggle.style.minWidth = '44px';
    streamToggle.style.minHeight = '44px';
    streamToggle.style.border = 'none';
    streamToggle.style.borderRadius = '6px';
    streamToggle.style.cursor = 'pointer';
    streamToggle.style.fontSize = '14px';
    streamToggle.style.background = 'rgba(255, 255, 255, 0.1)';
    streamToggle.style.color = 'white';
    streamToggle.style.transition = 'all 0.3s';
    streamToggle.style.display = 'flex';
    streamToggle.style.alignItems = 'center';
    streamToggle.style.justifyContent = 'center';
    streamToggle.innerHTML = '<span style="font-size: 20px;">▶</span>';
    streamToggle.id = 'stream-button';
    controlsTop.appendChild(streamToggle);
    
    // Settings toggle button
    const settingsToggle = document.createElement('button');
    settingsToggle.className = 'button icon-button';
    settingsToggle.title = 'Settings';
    settingsToggle.style.padding = '10px';
    settingsToggle.style.minWidth = '44px';
    settingsToggle.style.minHeight = '44px';
    settingsToggle.style.border = 'none';
    settingsToggle.style.borderRadius = '6px';
    settingsToggle.style.cursor = 'pointer';
    settingsToggle.style.fontSize = '14px';
    settingsToggle.style.background = 'rgba(255, 255, 255, 0.1)';
    settingsToggle.style.color = 'white';
    settingsToggle.style.transition = 'all 0.3s';
    settingsToggle.style.display = 'flex';
    settingsToggle.style.alignItems = 'center';
    settingsToggle.style.justifyContent = 'center';
    settingsToggle.innerHTML = '<span style="font-size: 20px;">⚙</span>';
    settingsToggle.id = 'settings-toggle';
    controlsTop.appendChild(settingsToggle);
    
    // Close button in top-right corner
    const closeButton = document.createElement('button');
    closeButton.className = 'button icon-button';
    closeButton.title = 'Close';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '20px';
    closeButton.style.right = '80px'; // Place to the left of fullscreen button
    closeButton.style.zIndex = '10';
    closeButton.style.pointerEvents = 'all';
    closeButton.style.background = 'rgba(0, 0, 0, 0.5)';
    closeButton.style.padding = '10px';
    closeButton.style.borderRadius = '8px';
    closeButton.style.backdropFilter = 'blur(5px)';
    closeButton.style.minWidth = '44px';
    closeButton.style.minHeight = '44px';
    closeButton.style.border = 'none';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '14px';
    closeButton.style.color = 'white';
    closeButton.style.transition = 'all 0.3s';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.innerHTML = '<span style="font-size: 20px;">&times;</span>';
    closeButton.addEventListener('click', () => {
      this._stopStream();
      dialog.close();
      document.body.removeChild(dialog);
    });
    
    // Fullscreen button (in top-right corner)
    const fullscreenButton = document.createElement('button');
    fullscreenButton.className = 'button icon-button';
    fullscreenButton.title = 'Fullscreen';
    fullscreenButton.style.position = 'absolute';
    fullscreenButton.style.top = '20px';
    fullscreenButton.style.right = '20px';
    fullscreenButton.style.zIndex = '10';
    fullscreenButton.style.pointerEvents = 'all';
    fullscreenButton.style.background = 'rgba(0, 0, 0, 0.5)';
    fullscreenButton.style.padding = '10px';
    fullscreenButton.style.borderRadius = '8px';
    fullscreenButton.style.backdropFilter = 'blur(5px)';
    fullscreenButton.style.minWidth = '44px';
    fullscreenButton.style.minHeight = '44px';
    fullscreenButton.style.border = 'none';
    fullscreenButton.style.cursor = 'pointer';
    fullscreenButton.style.fontSize = '14px';
    fullscreenButton.style.color = 'white';
    fullscreenButton.style.transition = 'all 0.3s';
    fullscreenButton.style.display = 'flex';
    fullscreenButton.style.alignItems = 'center';
    fullscreenButton.style.justifyContent = 'center';
    fullscreenButton.innerHTML = '<span style="font-size: 20px;">⛶</span>';
    
    // Settings panel
    const settingsPanel = document.createElement('div');
    settingsPanel.style.position = 'fixed';
    settingsPanel.style.top = '0';
    settingsPanel.style.left = '-320px'; // Start off-screen
    settingsPanel.style.width = '320px';
    settingsPanel.style.height = '100%';
    settingsPanel.style.background = 'rgba(0, 0, 0, 0.85)';
    settingsPanel.style.backdropFilter = 'blur(10px)';
    settingsPanel.style.zIndex = '1000';
    settingsPanel.style.transition = 'left 0.3s ease';
    settingsPanel.style.padding = '20px';
    settingsPanel.style.overflowY = 'auto';
    settingsPanel.style.boxShadow = '5px 0 15px rgba(0, 0, 0, 0.5)';
    settingsPanel.style.boxSizing = 'border-box';
    settingsPanel.id = 'settings-panel';

    // Settings close button
    const settingsClose = document.createElement('div');
    settingsClose.innerHTML = '&times;';
    settingsClose.style.position = 'absolute';
    settingsClose.style.top = '15px';
    settingsClose.style.right = '15px';
    settingsClose.style.fontSize = '24px';
    settingsClose.style.cursor = 'pointer';
    settingsClose.style.color = '#fff';
    settingsClose.style.opacity = '0.7';
    settingsClose.id = 'settings-close';
    settingsClose.addEventListener('mouseenter', () => {
      settingsClose.style.opacity = '1';
    });
    settingsClose.addEventListener('mouseleave', () => {
      settingsClose.style.opacity = '0.7';
    });
    settingsPanel.appendChild(settingsClose);

    // Settings title
    const settingsTitle = document.createElement('div');
    settingsTitle.textContent = 'Settings';
    settingsTitle.style.fontSize = '18px';
    settingsTitle.style.marginBottom = '20px';
    settingsTitle.style.fontWeight = 'bold';
    settingsTitle.style.borderBottom = '1px solid rgba(255, 255, 255, 0.2)';
    settingsTitle.style.paddingBottom = '10px';
    settingsPanel.appendChild(settingsTitle);

    // Resolution select
    const resolutionSection = document.createElement('div');
    resolutionSection.style.marginBottom = '25px';
    
    const resolutionSelect = document.createElement('select');
    resolutionSelect.id = 'resolution-select';
    resolutionSelect.style.background = 'rgba(255, 255, 255, 0.1)';
    resolutionSelect.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    resolutionSelect.style.color = 'white';
    resolutionSelect.style.padding = '6px 10px';
    resolutionSelect.style.borderRadius = '4px';
    resolutionSelect.style.width = '100%';
    
    // Resolution options
    const resolutions = [
      { value: 'QQVGA', text: 'QQVGA (160x120)' },
      { value: 'QCIF', text: 'QCIF (176x144)' },
      { value: 'HQVGA', text: 'HQVGA (240x176)' },
      { value: '240X240', text: '240X240 (240x240)' },
      { value: 'QVGA', text: 'QVGA (320x240)' },
      { value: 'CIF', text: 'CIF (400x296)' },
      { value: 'HVGA', text: 'HVGA (480x320)' },
      { value: 'VGA', text: 'VGA (640x480)' },
      { value: 'SVGA', text: 'SVGA (800x600)' },
      { value: 'XGA', text: 'XGA (1024x768)' },
      { value: 'HD', text: 'HD (1280x720)' },
      { value: 'SXGA', text: 'SXGA (1280x1024)' },
      { value: 'UXGA', text: 'UXGA (1600x1200)' }
    ];
    
    resolutions.forEach(res => {
      const option = document.createElement('option');
      option.value = res.value;
      option.textContent = res.text;
      resolutionSelect.appendChild(option);
    });
    
    resolutionSelect.value = 'VGA'; // Default value
    resolutionSection.appendChild(resolutionSelect);
    settingsPanel.appendChild(resolutionSection);

    // Quality slider section
    const qualitySection = document.createElement('div');
    qualitySection.style.marginBottom = '25px';
    
    const qualitySliderContainer = document.createElement('div');
    qualitySliderContainer.style.width = '100%';
    qualitySliderContainer.style.margin = '10px 0';
    
    const qualitySlider = document.createElement('input');
    qualitySlider.type = 'range';
    qualitySlider.min = '8';
    qualitySlider.max = '64';
    qualitySlider.value = '12';
    qualitySlider.style.width = '100%';
    qualitySlider.style.WebkitAppearance = 'none';
    qualitySlider.style.height = '6px';
    qualitySlider.style.borderRadius = '3px';
    qualitySlider.style.background = 'rgba(255, 255, 255, 0.2)';
    qualitySlider.style.outline = 'none';
    qualitySlider.id = 'quality-slider';
    
    // Thumb styling for WebKit
    const thumbStyle = document.createElement('style');
    thumbStyle.textContent = `
      #quality-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--primary-color, #4CAF50);
        cursor: pointer;
      }
      #quality-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--primary-color, #4CAF50);
        cursor: pointer;
        border: none;
      }
      #led-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--primary-color, #4CAF50);
        cursor: pointer;
      }
      #led-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--primary-color, #4CAF50);
        cursor: pointer;
        border: none;
      }
    `;
    document.head.appendChild(thumbStyle);
    
    const qualityValue = document.createElement('div');
    qualityValue.textContent = '12 (Higher quality)';
    qualityValue.style.textAlign = 'center';
    qualityValue.style.marginTop = '5px';
    qualityValue.style.fontSize = '12px';
    qualityValue.style.opacity = '0.7';
    qualityValue.id = 'quality-value';
    
    qualitySliderContainer.appendChild(qualitySlider);
    qualitySliderContainer.appendChild(qualityValue);
    qualitySection.appendChild(qualitySliderContainer);
    settingsPanel.appendChild(qualitySection);

    // LED control section
    const ledSection = document.createElement('div');
    ledSection.style.marginBottom = '25px';
    
    const ledSliderContainer = document.createElement('div');
    ledSliderContainer.style.width = '100%';
    ledSliderContainer.style.margin = '10px 0';
    
    const ledSlider = document.createElement('input');
    ledSlider.type = 'range';
    ledSlider.min = '0';
    ledSlider.max = '100';
    ledSlider.value = '0';
    ledSlider.style.width = '100%';
    ledSlider.style.WebkitAppearance = 'none';
    ledSlider.style.height = '6px';
    ledSlider.style.borderRadius = '3px';
    ledSlider.style.background = 'rgba(255, 255, 255, 0.2)';
    ledSlider.style.outline = 'none';
    ledSlider.id = 'led-slider';
    
    const ledValue = document.createElement('div');
    ledValue.textContent = 'LED: Off';
    ledValue.style.textAlign = 'center';
    ledValue.style.marginTop = '5px';
    ledValue.style.fontSize = '12px';
    ledValue.style.opacity = '0.7';
    ledValue.id = 'led-value';
    
    ledSliderContainer.appendChild(ledSlider);
    ledSliderContainer.appendChild(ledValue);
    ledSection.appendChild(ledSliderContainer);
    settingsPanel.appendChild(ledSection);

    // Settings overlay (for closing when clicking outside)
    const settingsOverlay = document.createElement('div');
    settingsOverlay.style.position = 'fixed';
    settingsOverlay.style.top = '0';
    settingsOverlay.style.left = '0';
    settingsOverlay.style.right = '0';
    settingsOverlay.style.bottom = '0';
    settingsOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
    settingsOverlay.style.zIndex = '999';
    settingsOverlay.style.display = 'none';
    settingsOverlay.id = 'settings-overlay';
    
    // Right controls section (joystick)
    const controlsRight = document.createElement('div');
    controlsRight.style.position = 'absolute';
    controlsRight.style.right = '20px';
    controlsRight.style.top = '50%';
    controlsRight.style.transform = 'translateY(-50%)';
    controlsRight.style.pointerEvents = 'all';
    controlsRight.style.display = 'flex';
    controlsRight.style.flexDirection = 'column';
    controlsRight.style.gap = '16px';
    
    // Joystick container
    const joystickContainer = document.createElement('div');
    joystickContainer.style.width = '200px';
    joystickContainer.style.height = '200px';
    joystickContainer.style.background = 'rgba(0, 0, 0, 0.5)';
    joystickContainer.style.borderRadius = '50%';
    joystickContainer.style.touchAction = 'none';
    joystickContainer.style.position = 'relative';
    joystickContainer.style.backdropFilter = 'blur(5px)';
    joystickContainer.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    joystickContainer.id = 'joystick-container';
    
    // Joystick handle
    const joystickHandle = document.createElement('div');
    joystickHandle.style.width = '40%';
    joystickHandle.style.height = '40%';
    joystickHandle.style.background = 'rgba(255, 255, 255, 0.8)';
    joystickHandle.style.borderRadius = '50%';
    joystickHandle.style.position = 'absolute';
    joystickHandle.style.top = '50%';
    joystickHandle.style.left = '50%';
    joystickHandle.style.transform = 'translate(-50%, -50%)';
    joystickHandle.style.cursor = 'pointer';
    joystickHandle.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
    joystickHandle.id = 'stick';
    joystickContainer.appendChild(joystickHandle);
    
    controlsRight.appendChild(joystickContainer);
    
    // Status display for FPS (bottom right)
    const fpsStatus = document.createElement('div');
    fpsStatus.style.position = 'absolute';
    fpsStatus.style.bottom = '10px';
    fpsStatus.style.right = '10px';
    fpsStatus.style.background = 'rgba(0, 0, 0, 0.5)';
    fpsStatus.style.color = 'white';
    fpsStatus.style.padding = '5px 8px';
    fpsStatus.style.borderRadius = '4px';
    fpsStatus.style.fontSize = '12px';
    fpsStatus.style.zIndex = '10';
    fpsStatus.id = 'fps-status';
    fpsStatus.textContent = 'FPS: --';
    fpsStatus.style.display = 'none'; // Initially hidden
    
    // Add all elements to the container
    controlsOverlay.appendChild(controlsTop);
    controlsOverlay.appendChild(controlsRight);
    controlsOverlay.appendChild(closeButton);
    controlsOverlay.appendChild(fullscreenButton);
    controlsOverlay.appendChild(fpsStatus);
    
    container.appendChild(videoContainer);
    container.appendChild(controlsOverlay);
    container.appendChild(settingsPanel);
    container.appendChild(settingsOverlay);
    
    // Add container to the dialog
    dialog.appendChild(container);

    // Add dialog to the document
    document.body.appendChild(dialog);
    dialog.showModal();
    
    // Initialize settings panel toggle behavior
    settingsToggle.addEventListener('click', () => {
      settingsPanel.style.left = settingsPanel.style.left === '0px' ? '-320px' : '0px';
      settingsOverlay.style.display = settingsPanel.style.left === '0px' ? 'block' : 'none';
    });
    
    settingsClose.addEventListener('click', () => {
      settingsPanel.style.left = '-320px';
      settingsOverlay.style.display = 'none';
    });
    
    settingsOverlay.addEventListener('click', () => {
      settingsPanel.style.left = '-320px';
      settingsOverlay.style.display = 'none';
    });

    // Add event listeners for quality slider
    qualitySlider.addEventListener('input', function() {
      const value = this.value;
      qualityValue.textContent = value + (value < 30 ? " (Higher quality)" : " (Lower quality)");
    });

    // Add event listeners for quality and resolution settings
    qualitySlider.addEventListener('change', () => {
      this._sendQualitySettings(entityId, resolutionSelect.value, qualitySlider.value);
    });

    resolutionSelect.addEventListener('change', () => {
      this._sendQualitySettings(entityId, resolutionSelect.value, qualitySlider.value);
    });

    // Add event listeners for LED slider
    ledSlider.addEventListener('input', function() {
      const value = parseInt(this.value);
      ledValue.textContent = value === 0 ? "LED: Off" : `LED: ${value}%`;
    });

    ledSlider.addEventListener('change', () => {
      this._sendLedSetting(entityId, ledSlider.value);
    });
    
    // Initialize functionality
    this._initializeStreaming(entityId, videoImg, loadingEl, streamToggle, fpsStatus);
    this._initializeJoystick(entityId, joystickContainer, joystickHandle);
    this._initializeFullscreen(fullscreenButton, dialog);
    this._initializeCameraSettings(entityId, resolutionSelect, qualitySlider, qualityValue, ledSlider, ledValue);
  }
  
  _initializeStreaming(entityId, videoImg, loadingEl, streamButton, fpsStatus) {
    // Move isStreaming to a class property so it can be accessed by all methods
    this._isStreaming = false;
    
    // Function to start streaming
    const startStream = async () => {
      this._isStreaming = true;
      streamButton.innerHTML = '<span style="font-size: 20px;">■</span>';
      streamButton.classList.add('active');
      loadingEl.style.display = 'block';
      loadingEl.textContent = 'Starting stream...';
      videoImg.style.display = 'none';
      
      try {
        // Get a signed URL using the simple promise-based API
        const signedUrl = await this._getSignedStreamUrl(entityId);
        console.log("Got signed URL for stream");
        
        // Set up the video stream with the signed URL
        videoImg.src = this._hass.hassUrl(signedUrl);
        
        videoImg.onload = () => {
          console.log("Stream loaded successfully");
          loadingEl.style.display = 'none';
          videoImg.style.display = 'block';
          fpsStatus.style.display = 'block'; // Show FPS when stream starts
        };
        
        videoImg.onerror = (error) => {
          console.error("Stream error:", error);
          loadingEl.textContent = 'Stream error. Please try again.';
          this._isStreaming = false;
          streamButton.innerHTML = '<span style="font-size: 20px;">▶</span>';
          streamButton.classList.remove('active');
          fpsStatus.style.display = 'none';
        };
        
        // Poll for status updates
        this._startStatusPolling(entityId, fpsStatus);
      } catch (error) {
        console.error('Error starting stream:', error);
        loadingEl.textContent = `Stream error: ${error.message}`;
        this._isStreaming = false;
        streamButton.innerHTML = '<span style="font-size: 20px;">▶</span>';
        streamButton.classList.remove('active');
        fpsStatus.style.display = 'none';
      }
    };
    
    // Function to stop streaming
    this._stopStream = () => {
      if (this._statusInterval) {
        clearInterval(this._statusInterval);
        this._statusInterval = null;
      }
      
      // Send request to stop the stream on the device
      this._hass.fetchWithAuth(`/api/esp32_robot/proxy/${entityId}/stopstream`, {
        method: 'GET',
        cache: 'no-store',
      }).catch(error => {
        console.error('Error stopping stream:', error);
      });
      
      this._isStreaming = false;
      streamButton.innerHTML = '<span style="font-size: 20px;">▶</span>';
      streamButton.classList.remove('active');
      videoImg.src = '';
      videoImg.style.display = 'none';
      loadingEl.style.display = 'block';
      loadingEl.textContent = 'Click Start Stream button';
      fpsStatus.style.display = 'none';
    };
    
    // Initialize button click
    streamButton.addEventListener('click', () => {
      if (this._isStreaming) {
        this._stopStream();
      } else {
        startStream();
      }
    });
    
    // Do not start stream by default, just show the placeholder
    loadingEl.textContent = 'Click Start Stream button';
  }
  
  // Simple promise-based function to get a signed URL
  async _getSignedStreamUrl(robotId, expires = 300) {  // Increased expiration to 5 minutes for safety
    const path = `/api/esp32_robot/proxy/${robotId}/stream`;
    
    try {
      const result = await this._hass.connection.sendMessagePromise({
        type: "auth/sign_path",
        path,
        expires,
      });
      
      console.log("Signed URL response:", result);
      
      // Handle the response format correctly - the signed URL is directly in the path property
      if (result?.path) {
        return result.path;  // The signed path with ?authSig=...
      } else if (result?.result?.path) {
        return result.result.path;  // Alternative format just in case
      } else {
        console.error("Invalid response format:", result);
        throw new Error("Failed to get signed path");
      }
    } catch (error) {
      console.error("Error getting signed URL:", error);
      throw error;
    }
  }
  
  _startStatusPolling(entityId, fpsStatus) {
    const statusUrl = `/api/esp32_robot/proxy/${entityId}/status`;
    
    // Clear existing interval
    if (this._statusInterval) {
      clearInterval(this._statusInterval);
    }
    
    // Function to update status
    const updateStatus = async () => {
      try {
        const response = await this._hass.fetchWithAuth(statusUrl);
        if (response.ok) {
          const data = await response.json();
          // Update FPS with one decimal place
          if (data.fps !== undefined) {
            fpsStatus.textContent = `FPS: ${data.fps.toFixed(1)}`;
            fpsStatus.style.display = 'block';
          } else {
            fpsStatus.textContent = 'FPS: --';
          }
        } else {
          fpsStatus.textContent = 'FPS: error';
        }
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };
    
    // Initial update
    updateStatus();
    
    // Poll every 2 seconds
    this._statusInterval = setInterval(updateStatus, 2000);
  }
  
  _initializeJoystick(entityId, joystickContainer, joystickHandle) {
    const baseControlUrl = `/api/esp32_robot/proxy/${entityId}/control`;
    let isDragging = false;
    let currentX = 0, currentY = 0;
    let lastJoystickSendTime = 0;
    let pendingJoystickSend = null;
    const THROTTLE_MS = 100; // Throttle sending commands to 10 times per second
    
    // Function to send joystick data with throttling
    const sendJoystickData = (x, y, force = false) => {
      const now = Date.now();
      
      // Clear any pending timeout
      if (pendingJoystickSend) {
        clearTimeout(pendingJoystickSend.timeout);
      }
      
      // If forced or enough time has passed, send immediately
      if (force || now - lastJoystickSendTime >= THROTTLE_MS) {
        this._sendControlCommand(baseControlUrl, x, y);
        lastJoystickSendTime = now;
        pendingJoystickSend = null;
      } else {
        // Schedule to send at next available time
        pendingJoystickSend = {
          data: { x, y },
          timeout: setTimeout(() => {
            sendJoystickData(x, y, true);
          }, THROTTLE_MS - (now - lastJoystickSendTime))
        };
      }
    };
    
    // Function to handle joystick movement
    const handleJoystickMove = (event) => {
      if (!isDragging) return;
      
      const rect = joystickContainer.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Get touch or mouse position
      const clientX = event.clientX || event.touches[0].clientX;
      const clientY = event.clientY || event.touches[0].clientY;
      
      // Calculate relative position from center
      let x = clientX - rect.left - centerX;
      let y = clientY - rect.top - centerY;
      
      // Calculate the maximum offset based on container size and stick size
      const maxOffset = rect.width / 2 - joystickHandle.offsetWidth / 2;
      
      // Limit to circle boundary
      const distance = Math.sqrt(x * x + y * y);
      if (distance > maxOffset) {
        const angle = Math.atan2(y, x);
        x = maxOffset * Math.cos(angle);
        y = maxOffset * Math.sin(angle);
      }
      
      // Update joystick position - use transform for better performance and centering
      joystickHandle.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      
      // Calculate normalized values (-1 to 1)
      const normalizedX = (x / maxOffset);
      const normalizedY = (-y / maxOffset); // Invert Y for traditional control scheme
      
      // Only send if values changed significantly
      if (Math.abs(normalizedX - currentX) > 0.05 || Math.abs(normalizedY - currentY) > 0.05) {
        currentX = normalizedX;
        currentY = normalizedY;
        sendJoystickData(normalizedX, normalizedY);
      }
    };
    
    // Function to reset joystick
    const resetJoystick = (sendData = true) => {
      isDragging = false;
      joystickHandle.style.transform = 'translate(-50%, -50%)';
      
      // Send stop command
      if (sendData && (currentX !== 0 || currentY !== 0)) {
        currentX = 0;
        currentY = 0;
        sendJoystickData(0, 0, true);
      }
    };
    
    // Function to send control command
    this._sendControlCommand = async (url, x, y) => {
      try {
        const response = await this._hass.fetchWithAuth(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            mode: 'joystick',
            x: parseFloat(x.toFixed(2)), // Convert to float with 2 decimal places for precision
            y: parseFloat(y.toFixed(2))  // Convert to float with 2 decimal places for precision
          })
        });
        
        if (!response.ok) {
          console.error('Control error:', response.status);
        }
      } catch (error) {
        console.error('Error sending control command:', error);
      }
    };
    
    // Mouse events for joystick - start dragging on the joystick handle
    joystickHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
    });
    
    // Also allow starting drag from anywhere in the joystick container
    joystickContainer.addEventListener('mousedown', (e) => {
      if (e.target !== joystickHandle) {
        e.preventDefault();
        isDragging = true;
        handleJoystickMove(e);
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      e.preventDefault();
      handleJoystickMove(e);
    });
    
    document.addEventListener('mouseup', (e) => {
      e.preventDefault();
      resetJoystick(true);
    });
    
    // Touch events for joystick
    joystickHandle.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isDragging = true;
      handleJoystickMove(e.touches[0]);
    }, { passive: false });
    
    joystickContainer.addEventListener('touchstart', (e) => {
      if (e.target !== joystickHandle) {
        e.preventDefault();
        isDragging = true;
        handleJoystickMove(e);
      }
    }, { passive: false });
    
    document.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (isDragging && e.touches.length > 0) {
        handleJoystickMove(e);
      }
    }, { passive: false });
    
    document.addEventListener('touchend', (e) => {
      e.preventDefault();
      resetJoystick(true);
    }, { passive: false });
    
    document.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      resetJoystick(true);
    }, { passive: false });
    
    // Prevent zoom/scrolling on mobile devices
    document.addEventListener('gesturestart', (e) => {
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('gesturechange', (e) => {
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('gestureend', (e) => {
      e.preventDefault();
    }, { passive: false });
  }
  
  _initializeFullscreen(fullscreenButton, dialog) {
    fullscreenButton.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        dialog.requestFullscreen().catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      }
    });
  }

  // Add new method to initialize camera settings
  _initializeCameraSettings(entityId, resolutionSelect, qualitySlider, qualityValue, ledSlider, ledValue) {
    // Get current camera settings
    this._hass.fetchWithAuth(`/api/esp32_robot/proxy/${entityId}/camera/settings`, {
      method: 'GET',
      cache: 'no-store',
    })
    .then(response => response.json())
    .then(data => {
      // Update resolution select
      if (data.resolution) {
        const option = Array.from(resolutionSelect.options).find(opt => opt.value === data.resolution);
        if (option) {
          resolutionSelect.value = data.resolution;
        }
      }
      
      // Update quality slider
      if (data.quality) {
        qualitySlider.value = data.quality;
        qualityValue.textContent = data.quality + 
          (data.quality < 30 ? " (Higher quality)" : " (Lower quality)");
      }
      
      // Set initial LED value
      if (data.led_brightness !== undefined) {
        const brightness = parseInt(data.led_brightness);
        ledSlider.value = brightness;
        ledValue.textContent = brightness === 0 ? "LED: Off" : `LED: ${brightness}%`;
      }
    })
    .catch(error => {
      console.error('Failed to get camera settings:', error);
    });
  }

  // Add method to send quality settings
  _sendQualitySettings(entityId, resolution, quality) {
    this._hass.fetchWithAuth(`/api/esp32_robot/proxy/${entityId}/quality?resolution=${resolution}&quality=${quality}`, {
      method: 'GET',
      cache: 'no-store',
    })
    .then(response => {
      console.log(`Quality updated: ${resolution}, compression: ${quality}`);
    })
    .catch(error => {
      console.error('Failed to change quality:', error);
    });
  }

  // Add method to send LED settings
  _sendLedSetting(entityId, brightness) {
    this._hass.fetchWithAuth(`/api/esp32_robot/proxy/${entityId}/led?brightness=${brightness}`, {
      method: 'GET',
      cache: 'no-store',
    })
    .then(response => {
      console.log(`LED brightness set to ${brightness}%`);
    })
    .catch(error => {
      console.error('Failed to control LED:', error);
    });
  }
}

customElements.define("esp32-robot-card", ESP32RobotCard);

// Для HACS и регистрации карточки
window.customCards = window.customCards || [];
window.customCards.push({
  type: "esp32-robot-card",
  name: "ESP32 Robot Card",
  description: "A card to monitor and control an ESP32 Robot"
}); 
