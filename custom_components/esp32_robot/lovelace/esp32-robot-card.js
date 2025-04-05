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
    dialog.style.width = '100%';
    dialog.style.height = '100%';
    dialog.style.padding = '0';
    dialog.style.margin = '0';
    dialog.style.border = 'none';
    dialog.style.zIndex = '9999';
    dialog.style.backgroundColor = '#000'; // Pure black background
    dialog.style.color = 'var(--primary-text-color, #fff)';
    dialog.style.overflow = 'hidden'; // Prevent scrolling
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';

    // Create header with title and close button
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.padding = '16px';
    header.style.position = 'absolute';
    header.style.top = '0';
    header.style.left = '0';
    header.style.right = '0';
    header.style.zIndex = '10';
    header.style.background = 'rgba(0, 0, 0, 0.5)';
    header.style.backdropFilter = 'blur(5px)';
    
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
    controlsOverlay.appendChild(fullscreenButton);
    controlsOverlay.appendChild(fpsStatus);
    
    container.appendChild(videoContainer);
    container.appendChild(controlsOverlay);
    
    // Add elements to the dialog
    dialog.appendChild(header);
    dialog.appendChild(container);

    // Add dialog to the document
    document.body.appendChild(dialog);
    dialog.showModal();
    
    // Initialize functionality
    this._initializeStreaming(entityId, videoImg, loadingEl, streamToggle, fpsStatus);
    this._initializeJoystick(entityId, joystickContainer, joystickHandle);
    this._initializeFullscreen(fullscreenButton, dialog);
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
}

customElements.define("esp32-robot-card", ESP32RobotCard);

// Для HACS и регистрации карточки
window.customCards = window.customCards || [];
window.customCards.push({
  type: "esp32-robot-card",
  name: "ESP32 Robot Card",
  description: "A card to monitor and control an ESP32 Robot"
}); 
