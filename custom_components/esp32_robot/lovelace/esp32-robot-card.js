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
    const fps = this._entity.attributes.fps !== undefined ? this._entity.attributes.fps : '';
    const streaming = this._entity.attributes.streaming !== undefined ? this._entity.attributes.streaming : '';

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
            ${isOnline && fps ? html`
              <div class="attribute">
                <div>FPS:</div>
                <div>${fps}</div>
              </div>
            ` : ''}
            ${isOnline && streaming !== undefined ? html`
              <div class="attribute">
                <div>Streaming:</div>
                <div>${streaming ? 'Yes' : 'No'}</div>
              </div>
            ` : ''}
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

    // Create a modal dialog
    const dialog = document.createElement('dialog');
    dialog.id = `esp32-robot-dialog-${entityId}`;
    dialog.className = 'esp32-robot-dialog';
    dialog.style.position = 'fixed';
    dialog.style.top = '0';
    dialog.style.left = '0';
    dialog.style.width = '100%';
    dialog.style.height = '100%';
    dialog.style.padding = '0';
    dialog.style.border = 'none';
    dialog.style.zIndex = '9999';
    dialog.style.backgroundColor = 'var(--primary-background-color, #111)';
    dialog.style.color = 'var(--primary-text-color, #fff)';
    dialog.style.overflow = 'auto';
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';

    // Create header with title and close button
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.padding = '16px';
    header.style.borderBottom = '1px solid var(--divider-color, rgba(255,255,255,0.12))';
    
    const headerTitle = document.createElement('h2');
    headerTitle.textContent = title;
    headerTitle.style.margin = '0';
    headerTitle.style.fontSize = '18px';
    headerTitle.style.fontWeight = '500';
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.background = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.color = 'var(--primary-text-color, #fff)';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '4px 8px';
    closeButton.addEventListener('click', () => {
      this._stopStream();
      dialog.close();
      document.body.removeChild(dialog);
    });
    
    header.appendChild(headerTitle);
    header.appendChild(closeButton);

    // Create container for controls
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.flex = '1';
    container.style.padding = '16px';
    container.style.boxSizing = 'border-box';
    container.style.maxWidth = '960px';
    container.style.margin = '0 auto';
    container.style.width = '100%';

    // Create video container
    const videoContainer = document.createElement('div');
    videoContainer.style.position = 'relative';
    videoContainer.style.width = '100%';
    videoContainer.style.backgroundColor = 'var(--card-background-color, #000)';
    videoContainer.style.borderRadius = 'var(--ha-card-border-radius, 8px)';
    videoContainer.style.overflow = 'hidden';
    videoContainer.style.marginBottom = '16px';
    videoContainer.style.display = 'flex';
    videoContainer.style.justifyContent = 'center';
    videoContainer.style.alignItems = 'center';
    videoContainer.style.aspectRatio = '4/3';
    videoContainer.style.maxHeight = '50vh';

    // Loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.textContent = 'Click Start Stream button below';
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

    // Status display
    const statusContainer = document.createElement('div');
    statusContainer.style.display = 'flex';
    statusContainer.style.justifyContent = 'space-between';
    statusContainer.style.marginBottom = '16px';
    statusContainer.style.padding = '8px 16px';
    statusContainer.style.backgroundColor = 'var(--card-background-color, rgba(255,255,255,0.05))';
    statusContainer.style.borderRadius = 'var(--ha-card-border-radius, 8px)';
    
    const statusLeft = document.createElement('div');
    statusLeft.id = 'status-left';
    statusLeft.textContent = 'FPS: --';
    
    const statusRight = document.createElement('div');
    statusRight.id = 'status-right';
    statusRight.textContent = 'Stream: inactive';
    
    statusContainer.appendChild(statusLeft);
    statusContainer.appendChild(statusRight);

    // Controls grid layout
    const controlsGrid = document.createElement('div');
    controlsGrid.style.display = 'grid';
    controlsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
    controlsGrid.style.gap = '16px';
    
    // Joystick container
    const joystickSection = document.createElement('div');
    joystickSection.style.display = 'flex';
    joystickSection.style.flexDirection = 'column';
    
    const joystickTitle = document.createElement('h3');
    joystickTitle.textContent = 'Controls';
    joystickTitle.style.margin = '0 0 8px 0';
    joystickTitle.style.fontSize = '16px';
    joystickTitle.style.fontWeight = '500';
    
    const joystickContainer = document.createElement('div');
    joystickContainer.style.position = 'relative';
    joystickContainer.style.width = '100%';
    joystickContainer.style.aspectRatio = '1/1';
    joystickContainer.style.backgroundColor = 'var(--card-background-color, rgba(255,255,255,0.1))';
    joystickContainer.style.borderRadius = '50%';
    joystickContainer.style.touchAction = 'none';
    joystickContainer.style.marginTop = 'auto';
    joystickContainer.style.marginBottom = 'auto';
    joystickContainer.style.maxWidth = '300px';
    joystickContainer.style.alignSelf = 'center';
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
    
    joystickSection.appendChild(joystickTitle);
    joystickSection.appendChild(joystickContainer);
    
    // Stream settings section
    const streamSection = document.createElement('div');
    streamSection.style.display = 'flex';
    streamSection.style.flexDirection = 'column';
    
    const streamTitle = document.createElement('h3');
    streamTitle.textContent = 'Stream';
    streamTitle.style.margin = '0 0 8px 0';
    streamTitle.style.fontSize = '16px';
    streamTitle.style.fontWeight = '500';
    
    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.marginTop = '16px';
    
    // Stream toggle button
    const streamButton = document.createElement('button');
    streamButton.textContent = 'Start Stream';
    streamButton.className = 'ha-button primary';
    streamButton.style.padding = '8px 16px';
    streamButton.style.borderRadius = 'var(--ha-card-border-radius, 4px)';
    streamButton.style.backgroundColor = 'var(--primary-color, #03a9f4)';
    streamButton.style.color = 'var(--text-primary-color, #fff)';
    streamButton.style.border = 'none';
    streamButton.style.cursor = 'pointer';
    streamButton.style.flex = '1';
    streamButton.id = 'stream-button';
    
    // Fullscreen button
    const fullscreenButton = document.createElement('button');
    fullscreenButton.textContent = 'Fullscreen';
    fullscreenButton.className = 'ha-button';
    fullscreenButton.style.padding = '8px 16px';
    fullscreenButton.style.borderRadius = 'var(--ha-card-border-radius, 4px)';
    fullscreenButton.style.backgroundColor = 'var(--card-background-color, rgba(255,255,255,0.1))';
    fullscreenButton.style.color = 'var(--primary-text-color, #fff)';
    fullscreenButton.style.border = 'none';
    fullscreenButton.style.cursor = 'pointer';
    fullscreenButton.id = 'fullscreen-button';
    
    buttonContainer.appendChild(streamButton);
    buttonContainer.appendChild(fullscreenButton);
    
    streamSection.appendChild(streamTitle);
    streamSection.appendChild(buttonContainer);
    
    // Add all elements to the grid
    controlsGrid.appendChild(joystickSection);
    controlsGrid.appendChild(streamSection);

    // Add all elements to the container
    container.appendChild(videoContainer);
    container.appendChild(statusContainer);
    container.appendChild(controlsGrid);
    
    // Add elements to the dialog
    dialog.appendChild(header);
    dialog.appendChild(container);

    // Add dialog to the document
    document.body.appendChild(dialog);
    dialog.showModal();
    
    // Initialize functionality
    this._initializeStreaming(entityId, videoImg, loadingEl, streamButton, statusLeft, statusRight);
    this._initializeJoystick(entityId, joystickContainer, joystickHandle);
    this._initializeFullscreen(fullscreenButton, dialog);
  }
  
  _initializeStreaming(entityId, videoImg, loadingEl, streamButton, statusLeft, statusRight) {
    // Move isStreaming to a class property so it can be accessed by all methods
    this._isStreaming = false;
    let signedUrlRefreshTimer = null;
    
    // Function to start streaming
    const startStream = async () => {
      this._isStreaming = true;
      streamButton.textContent = 'Stop Stream';
      loadingEl.style.display = 'block';
      loadingEl.textContent = 'Starting stream...';
      videoImg.style.display = 'none';
      
      try {
        // Make sure the connection is ready
        await this._ensureConnectionReady();
        
        // Get a signed URL using the WebSocket API
        await this._getSignedUrlAndStartStream(entityId, videoImg, loadingEl, signedUrlRefreshTimer);
        
        // Poll for status updates
        this._startStatusPolling(entityId, statusLeft, statusRight);
      } catch (error) {
        console.error('Error starting stream:', error);
        loadingEl.textContent = `Stream error: ${error.message}`;
        this._isStreaming = false;
        streamButton.textContent = 'Start Stream';
      }
    };
    
    // Function to stop streaming
    this._stopStream = () => {
      if (this._statusInterval) {
        clearInterval(this._statusInterval);
        this._statusInterval = null;
      }
      
      // Clear the URL refresh timer
      if (signedUrlRefreshTimer) {
        clearTimeout(signedUrlRefreshTimer);
        signedUrlRefreshTimer = null;
      }
      
      // Send request to stop the stream on the device
      this._hass.fetchWithAuth(`/api/esp32_robot/proxy/${entityId}/stopstream`, {
        method: 'GET',
        cache: 'no-store',
      }).catch(error => {
        console.error('Error stopping stream:', error);
      });
      
      this._isStreaming = false;
      streamButton.textContent = 'Start Stream';
      videoImg.src = '';
      videoImg.style.display = 'none';
      loadingEl.style.display = 'block';
      loadingEl.textContent = 'Click Start Stream button below';
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
    loadingEl.textContent = 'Click Start Stream button below';
    
    // Helper method to get signed URL using WebSocket API and set up automatic refreshing
    this._getSignedUrlAndStartStream = async (entityId, videoImg, loadingEl, signedUrlRefreshTimer) => {
      try {
        // Make sure the connection is ready
        await this._ensureConnectionReady();
        
        // Create a WebSocket message to get a signed path
        const msgId = Math.floor(Math.random() * 10000);
        const message = {
          id: msgId,
          type: "auth/sign_path",
          path: `/api/esp32_robot/proxy/${entityId}/stream`,
          expires: 110 // seconds (slightly less than 2 minutes)
        };
        
        console.log("Sending WebSocket message for signed URL:", message);
        
        // Send the WebSocket message
        const signedUrlPromise = new Promise((resolve, reject) => {
          // Set up a one-time event handler for this specific message ID
          const handleMessage = (event) => {
            try {
              const response = JSON.parse(event.data);
              console.log("Received WebSocket response:", response);
              
              // Check if this is the response to our request
              if (response.id === msgId) {
                console.log("Message ID matched, processing response");
                // Remove the event listener
                this._hass.connection.removeEventListener('message', handleMessage);
                
                if (response.success) {
                  console.log("Success, got path:", response.result.path);
                  resolve(response.result.path);
                } else {
                  console.log("Error in response:", response.error);
                  reject(new Error(`Failed to get signed URL: ${response.error?.message || 'Unknown error'}`));
                }
              }
            } catch (error) {
              console.error("Error parsing WebSocket response:", error, event.data);
            }
          };
          
          // Check if connection exists
          if (!this._hass.connection) {
            const errorMsg = "Home Assistant WebSocket connection not available";
            console.error(errorMsg);
            reject(new Error(errorMsg));
            return;
          }
          
          // Add the event listener
          this._hass.connection.addEventListener('message', handleMessage);
          
          // Send the WebSocket message
          try {
            this._hass.connection.sendMessage(message);
            console.log("WebSocket message sent successfully");
          } catch (error) {
            console.error("Error sending WebSocket message:", error);
            this._hass.connection.removeEventListener('message', handleMessage);
            reject(error);
          }
          
          // Set a timeout to prevent hanging if no response
          setTimeout(() => {
            console.log("Timeout waiting for signed URL response");
            this._hass.connection.removeEventListener('message', handleMessage);
            reject(new Error('Timeout getting signed URL'));
          }, 10000);
        });
        
        // Get the signed URL
        const signedUrl = await signedUrlPromise;
        console.log("Received signed URL:", signedUrl);
        
        // Set up the video stream with the signed URL
        videoImg.src = this._hass.hassUrl(signedUrl);
        
        videoImg.onload = () => {
          console.log("Stream loaded successfully");
          loadingEl.style.display = 'none';
          videoImg.style.display = 'block';
        };
        
        videoImg.onerror = (error) => {
          console.error("Stream error:", error);
          loadingEl.textContent = 'Stream error. Please try again.';
          this._isStreaming = false;
          streamButton.textContent = 'Start Stream';
        };
        
        // Set up automatic URL refresh before expiration (refresh 10 seconds early)
        if (signedUrlRefreshTimer) {
          clearTimeout(signedUrlRefreshTimer);
        }
        
        signedUrlRefreshTimer = setTimeout(() => {
          if (this._isStreaming) {
            console.log("Refreshing signed URL before expiration");
            this._refreshSignedUrl(entityId, videoImg, loadingEl, signedUrlRefreshTimer).catch(error => {
              console.error("Error refreshing signed URL:", error);
            });
          }
        }, (message.expires - 10) * 1000);
        
      } catch (error) {
        console.error("Error getting signed URL:", error);
        throw error;
      }
    };
  }
  
  // Make sure the WebSocket connection is ready
  _ensureConnectionReady() {
    return new Promise((resolve, reject) => {
      if (!this._hass || !this._hass.connection) {
        reject(new Error("Home Assistant WebSocket connection not available"));
        return;
      }
      
      // Check if the connection is ready
      if (this._hass.connection.haConnection && this._hass.connection.haConnection.connected) {
        resolve();
        return;
      }
      
      console.log("Waiting for WebSocket connection to be ready...");
      
      // Set up a listener for when the connection is ready
      const readyHandler = () => {
        console.log("WebSocket connection is now ready");
        this._hass.connection.removeEventListener("ready", readyHandler);
        resolve();
      };
      
      // Listen for the ready event
      this._hass.connection.addEventListener("ready", readyHandler);
      
      // Set a timeout in case connection never becomes ready
      setTimeout(() => {
        this._hass.connection.removeEventListener("ready", readyHandler);
        reject(new Error("Timeout waiting for WebSocket connection to be ready"));
      }, 10000);
    });
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
        const response = await this._hass.fetchWithAuth(statusUrl);
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
        const response = await this._hass.fetchWithAuth(`${url}?x=${x}&y=${y}`, {
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

  // Separate method for refreshing to avoid recursion issues
  _refreshSignedUrl = async (entityId, videoImg, loadingEl, signedUrlRefreshTimer) => {
    try {
      // Make sure the connection is ready
      await this._ensureConnectionReady();
      
      // Create a WebSocket message to get a signed path
      const msgId = Math.floor(Math.random() * 10000);
      const message = {
        id: msgId,
        type: "auth/sign_path",
        path: `/api/esp32_robot/proxy/${entityId}/stream`,
        expires: 110 // seconds (slightly less than 2 minutes)
      };
      
      console.log("Sending refresh WebSocket message for signed URL:", message);
      
      // Send the WebSocket message
      const signedUrlPromise = new Promise((resolve, reject) => {
        // Set up a one-time event handler for this specific message ID
        const handleMessage = (event) => {
          try {
            const response = JSON.parse(event.data);
            console.log("Received refresh WebSocket response:", response);
            
            // Check if this is the response to our request
            if (response.id === msgId) {
              console.log("Refresh message ID matched, processing response");
              // Remove the event listener
              this._hass.connection.removeEventListener('message', handleMessage);
              
              if (response.success) {
                console.log("Refresh success, got path:", response.result.path);
                resolve(response.result.path);
              } else {
                console.log("Error in refresh response:", response.error);
                reject(new Error(`Failed to get signed URL: ${response.error?.message || 'Unknown error'}`));
              }
            }
          } catch (error) {
            console.error("Error parsing refresh WebSocket response:", error, event.data);
          }
        };
        
        // Check if connection exists
        if (!this._hass.connection) {
          const errorMsg = "Home Assistant WebSocket connection not available";
          console.error(errorMsg);
          reject(new Error(errorMsg));
          return;
        }
        
        // Add the event listener
        this._hass.connection.addEventListener('message', handleMessage);
        
        // Send the WebSocket message
        try {
          this._hass.connection.sendMessage(message);
          console.log("Refresh WebSocket message sent successfully");
        } catch (error) {
          console.error("Error sending refresh WebSocket message:", error);
          this._hass.connection.removeEventListener('message', handleMessage);
          reject(error);
        }
        
        // Set a timeout to prevent hanging if no response
        setTimeout(() => {
          console.log("Timeout waiting for refresh signed URL response");
          this._hass.connection.removeEventListener('message', handleMessage);
          reject(new Error('Timeout getting refresh signed URL'));
        }, 10000);
      });
      
      // Get the signed URL
      const signedUrl = await signedUrlPromise;
      console.log("Received refresh signed URL:", signedUrl);
      
      // Update the video stream with the new signed URL
      // Only update if we're still streaming to avoid race conditions
      if (this._isStreaming) {
        console.log("Updating stream with new signed URL");
        videoImg.src = this._hass.hassUrl(signedUrl);
        
        // Set up the next refresh
        if (signedUrlRefreshTimer) {
          clearTimeout(signedUrlRefreshTimer);
        }
        
        signedUrlRefreshTimer = setTimeout(() => {
          if (this._isStreaming) {
            console.log("Refreshing signed URL before expiration");
            this._refreshSignedUrl(entityId, videoImg, loadingEl, signedUrlRefreshTimer).catch(error => {
              console.error("Error refreshing signed URL:", error);
            });
          }
        }, (message.expires - 10) * 1000);
      }
    } catch (error) {
      console.error("Error refreshing signed URL:", error);
      // If refresh fails but we're still streaming, try again after a delay
      if (this._isStreaming) {
        console.log("Retrying to refresh signed URL in 5 seconds...");
        setTimeout(() => {
          if (this._isStreaming) {
            this._refreshSignedUrl(entityId, videoImg, loadingEl, signedUrlRefreshTimer).catch(error => {
              console.error("Retry error refreshing signed URL:", error);
            });
          }
        }, 5000);
      }
    }
  };
}

customElements.define("esp32-robot-card", ESP32RobotCard);

// Для HACS и регистрации карточки
window.customCards = window.customCards || [];
window.customCards.push({
  type: "esp32-robot-card",
  name: "ESP32 Robot Card",
  description: "A card to monitor and control an ESP32 Robot"
}); 
