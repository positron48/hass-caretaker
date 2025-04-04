import { LitElement, html, css } from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

export class ESP32RobotCard extends LitElement {
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
    dialog.style.backgroundColor = '#111';
    dialog.style.overflow = 'hidden';

    // Create container for controls
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.padding = '16px';
    container.style.boxSizing = 'border-box';
    container.style.color = '#fff';

    // Create video container
    const videoContainer = document.createElement('div');
    videoContainer.style.position = 'relative';
    videoContainer.style.width = '100%';
    videoContainer.style.maxHeight = '70%';
    videoContainer.style.aspectRatio = '4/3';
    videoContainer.style.backgroundColor = '#000';
    videoContainer.style.borderRadius = '8px';
    videoContainer.style.overflow = 'hidden';
    videoContainer.style.marginBottom = '16px';
    videoContainer.style.display = 'flex';
    videoContainer.style.justifyContent = 'center';
    videoContainer.style.alignItems = 'center';

    // Loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.textContent = 'Loading stream...';
    loadingEl.style.position = 'absolute';
    loadingEl.style.color = '#fff';
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

    // Controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.style.display = 'flex';
    controlsContainer.style.flexDirection = 'column';
    controlsContainer.style.gap = '16px';
    controlsContainer.style.flex = '1';

    // Status display
    const statusContainer = document.createElement('div');
    statusContainer.style.display = 'flex';
    statusContainer.style.justifyContent = 'space-between';
    statusContainer.style.marginBottom = '8px';
    
    const statusLeft = document.createElement('div');
    statusLeft.id = 'status-left';
    statusLeft.textContent = 'FPS: --';
    
    const statusRight = document.createElement('div');
    statusRight.id = 'status-right';
    statusRight.textContent = 'Stream: inactive';
    
    statusContainer.appendChild(statusLeft);
    statusContainer.appendChild(statusRight);
    
    // Joystick container
    const joystickContainer = document.createElement('div');
    joystickContainer.style.position = 'relative';
    joystickContainer.style.width = '100%';
    joystickContainer.style.aspectRatio = '1/1';
    joystickContainer.style.backgroundColor = 'rgba(255,255,255,0.1)';
    joystickContainer.style.borderRadius = '50%';
    joystickContainer.style.touchAction = 'none';
    joystickContainer.id = 'joystick-container';
    
    // Joystick handle
    const joystickHandle = document.createElement('div');
    joystickHandle.style.position = 'absolute';
    joystickHandle.style.top = '50%';
    joystickHandle.style.left = '50%';
    joystickHandle.style.transform = 'translate(-50%, -50%)';
    joystickHandle.style.width = '40px';
    joystickHandle.style.height = '40px';
    joystickHandle.style.borderRadius = '50%';
    joystickHandle.style.backgroundColor = 'var(--primary-color, #03a9f4)';
    joystickHandle.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
    joystickHandle.id = 'joystick-handle';
    joystickContainer.appendChild(joystickHandle);
    
    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.marginTop = '16px';
    
    // Stream toggle button
    const streamButton = document.createElement('button');
    streamButton.textContent = 'Start Stream';
    streamButton.style.padding = '8px 16px';
    streamButton.style.borderRadius = '4px';
    streamButton.style.backgroundColor = 'var(--primary-color, #03a9f4)';
    streamButton.style.color = '#fff';
    streamButton.style.border = 'none';
    streamButton.style.cursor = 'pointer';
    streamButton.id = 'stream-button';
    
    // Fullscreen button
    const fullscreenButton = document.createElement('button');
    fullscreenButton.textContent = 'Fullscreen';
    fullscreenButton.style.padding = '8px 16px';
    fullscreenButton.style.borderRadius = '4px';
    fullscreenButton.style.backgroundColor = 'rgba(255,255,255,0.2)';
    fullscreenButton.style.color = '#fff';
    fullscreenButton.style.border = 'none';
    fullscreenButton.style.cursor = 'pointer';
    fullscreenButton.id = 'fullscreen-button';
    
    buttonContainer.appendChild(streamButton);
    buttonContainer.appendChild(fullscreenButton);

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
      this._stopStream();
      dialog.close();
      document.body.removeChild(dialog);
    });

    // Add all elements to the dialog
    controlsContainer.appendChild(statusContainer);
    controlsContainer.appendChild(joystickContainer);
    controlsContainer.appendChild(buttonContainer);
    
    container.appendChild(videoContainer);
    container.appendChild(controlsContainer);
    
    dialog.appendChild(container);
    dialog.appendChild(closeButton);

    // Add dialog to the document
    document.body.appendChild(dialog);
    dialog.showModal();
    
    // Initialize functionality
    this._initializeStreaming(entityId, videoImg, loadingEl, streamButton, statusLeft, statusRight);
    this._initializeJoystick(entityId, joystickContainer, joystickHandle);
    this._initializeFullscreen(fullscreenButton, dialog);
  }
  
  _initializeStreaming(entityId, videoImg, loadingEl, streamButton, statusLeft, statusRight) {
    const streamUrl = `/api/esp32_robot/proxy/${entityId}/stream`;
    let isStreaming = false;
    let streamInterval;
    let statusInterval;
    
    // Function to start streaming
    const startStream = () => {
      isStreaming = true;
      streamButton.textContent = 'Stop Stream';
      loadingEl.style.display = 'block';
      videoImg.style.display = 'none';
      
      // Set a random parameter to bypass caching
      const timestamp = new Date().getTime();
      videoImg.src = `${streamUrl}?t=${timestamp}`;
      
      videoImg.onload = () => {
        loadingEl.style.display = 'none';
        videoImg.style.display = 'block';
      };
      
      videoImg.onerror = () => {
        loadingEl.textContent = 'Stream error. Please try again.';
        isStreaming = false;
        streamButton.textContent = 'Start Stream';
      };
      
      // Poll for status updates
      this._startStatusPolling(entityId, statusLeft, statusRight);
    };
    
    // Function to stop streaming
    this._stopStream = () => {
      if (streamInterval) {
        clearInterval(streamInterval);
      }
      if (statusInterval) {
        clearInterval(statusInterval);
      }
      isStreaming = false;
      streamButton.textContent = 'Start Stream';
      videoImg.src = '';
      videoImg.style.display = 'none';
      loadingEl.style.display = 'block';
      loadingEl.textContent = 'Stream stopped';
    };
    
    // Initialize button click
    streamButton.addEventListener('click', () => {
      if (isStreaming) {
        this._stopStream();
      } else {
        startStream();
      }
    });
    
    // Start stream by default
    startStream();
  }
  
  _startStatusPolling(entityId, statusLeft, statusRight) {
    const statusUrl = `/api/esp32_robot/proxy/${entityId}/status`;
    
    // Clear existing interval
    if (this._statusInterval) {
      clearInterval(this._statusInterval);
    }
    
    // Function to update status
    const updateStatus = async () => {
      try {
        const response = await fetch(statusUrl);
        if (response.ok) {
          const data = await response.json();
          statusLeft.textContent = `FPS: ${data.fps || '--'}`;
          statusRight.textContent = `Stream: ${data.streaming ? 'active' : 'inactive'}`;
        } else {
          statusLeft.textContent = 'Status: error';
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
    let centerX, centerY, limitRadius;
    let lastX = 0, lastY = 0;
    
    // Calculate joystick boundaries
    const updateDimensions = () => {
      const rect = joystickContainer.getBoundingClientRect();
      centerX = rect.width / 2;
      centerY = rect.height / 2;
      limitRadius = Math.min(centerX, centerY) * 0.8;
    };
    
    // Initialize dimensions
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    // Helper to calculate distance from center
    const getDistance = (x, y) => {
      return Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    };
    
    // Function to move joystick
    const moveJoystick = (clientX, clientY) => {
      const rect = joystickContainer.getBoundingClientRect();
      let x = clientX - rect.left;
      let y = clientY - rect.top;
      
      // Limit to circle
      const distance = getDistance(x, y);
      if (distance > limitRadius) {
        const angle = Math.atan2(y - centerY, x - centerX);
        x = centerX + limitRadius * Math.cos(angle);
        y = centerY + limitRadius * Math.sin(angle);
      }
      
      // Update joystick position
      joystickHandle.style.left = `${x}px`;
      joystickHandle.style.top = `${y}px`;
      
      // Calculate control values (-100 to 100)
      const normalizedX = Math.round(((x - centerX) / limitRadius) * 100);
      const normalizedY = Math.round(((y - centerY) / limitRadius) * -100); // Invert Y
      
      // Only send control if values changed significantly
      if (Math.abs(normalizedX - lastX) > 5 || Math.abs(normalizedY - lastY) > 5) {
        lastX = normalizedX;
        lastY = normalizedY;
        this._sendControlCommand(baseControlUrl, normalizedX, normalizedY);
      }
    };
    
    // Function to reset joystick
    const resetJoystick = () => {
      joystickHandle.style.left = '50%';
      joystickHandle.style.top = '50%';
      joystickHandle.style.transform = 'translate(-50%, -50%)';
      
      // Send stop command
      if (lastX !== 0 || lastY !== 0) {
        lastX = 0;
        lastY = 0;
        this._sendControlCommand(baseControlUrl, 0, 0);
      }
    };
    
    // Function to send control command
    this._sendControlCommand = async (url, x, y) => {
      try {
        const response = await fetch(`${url}?x=${x}&y=${y}`, {
          method: 'POST'
        });
        if (!response.ok) {
          console.error('Control error:', response.status);
        }
      } catch (error) {
        console.error('Error sending control command:', error);
      }
    };
    
    // Mouse events
    joystickContainer.addEventListener('mousedown', (e) => {
      isDragging = true;
      joystickHandle.style.transform = 'none';
      moveJoystick(e.clientX, e.clientY);
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        moveJoystick(e.clientX, e.clientY);
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        resetJoystick();
      }
    });
    
    // Touch events
    joystickContainer.addEventListener('touchstart', (e) => {
      isDragging = true;
      joystickHandle.style.transform = 'none';
      moveJoystick(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('touchmove', (e) => {
      if (isDragging) {
        moveJoystick(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
      }
    }, { passive: false });
    
    document.addEventListener('touchend', () => {
      if (isDragging) {
        isDragging = false;
        resetJoystick();
      }
    });
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
}

customElements.define("esp32-robot-card", ESP32RobotCard);

// Для HACS и регистрации карточки
window.customCards = window.customCards || [];
window.customCards.push({
  type: "esp32-robot-card",
  name: "ESP32 Robot Card",
  description: "A card to monitor and control an ESP32 Robot"
}); 
