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
    const streamUrl = `/api/esp32_robot/proxy/${entityId}/stream`;
    let isStreaming = false;
    let mjpegController = null;
    
    // Function to start streaming
    const startStream = () => {
      isStreaming = true;
      streamButton.textContent = 'Stop Stream';
      loadingEl.style.display = 'block';
      videoImg.style.display = 'none';
      
      // Native MJPEG streaming with authentication
      try {
        // Create AbortController to allow stopping the stream
        const controller = new AbortController();
        const signal = controller.signal;
        mjpegController = controller;
        
        // Start the MJPEG stream with authenticated fetch
        if (typeof ReadableStream === 'undefined' || !window.TextEncoder) {
          // Fallback for browsers without ReadableStream or TextEncoder support
          console.log('Using fallback streaming method (not all browsers support ReadableStream)');
          this._fetchSingleFrame(streamUrl, videoImg, loadingEl, signal);
        } else {
          this._processMjpegStream(streamUrl, videoImg, loadingEl, signal)
            .catch(error => {
              console.warn('MJPEG streaming failed, falling back to single frame approach:', error);
              this._fetchSingleFrame(streamUrl, videoImg, loadingEl, signal);
            });
        }
        
        // Poll for status updates
        this._startStatusPolling(entityId, statusLeft, statusRight);
      } catch (error) {
        console.error('Error setting up stream:', error);
        loadingEl.textContent = 'Failed to setup stream. Please try again.';
        isStreaming = false;
        streamButton.textContent = 'Start Stream';
      }
    };
    
    // Function to process MJPEG stream
    this._processMjpegStream = async (url, imgElement, loadingEl, signal) => {
      try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const streamUrlWithTimestamp = `${url}?t=${timestamp}`;
        
        console.log('Starting MJPEG stream with authenticated request');
        
        // Fetch with authentication
        const response = await this._hass.fetchWithAuth(streamUrlWithTimestamp, {
          method: 'GET',
          signal: signal,
          headers: {
            'Accept': 'multipart/x-mixed-replace'
          }
        });
        
        if (!response.ok) {
          const errorMsg = `HTTP error! status: ${response.status}`;
          console.error(errorMsg);
          loadingEl.textContent = `Stream error: ${response.status} ${response.statusText}`;
          throw new Error(errorMsg);
        }
        
        if (!response.body) {
          const errorMsg = 'ReadableStream not supported in this browser';
          console.error(errorMsg);
          loadingEl.textContent = errorMsg;
          throw new Error(errorMsg);
        }
        
        // Get content type to verify it's a MJPEG stream
        const contentType = response.headers.get('Content-Type') || '';
        console.log('Stream Content-Type:', contentType);
        
        if (!contentType.includes('multipart/x-mixed-replace')) {
          // If it's not a multipart stream, show warning and treat as a single image
          console.warn('Not a MJPEG stream, content type:', contentType);
          const blob = await response.blob();
          imgElement.src = URL.createObjectURL(blob);
          imgElement.style.display = 'block';
          loadingEl.style.display = 'none';
          return;
        }
        
        // MJPEG stream handling
        const reader = response.body.getReader();
        const boundary = this._extractBoundary(contentType);
        let buffer = new Uint8Array(0);
        
        // Show the image element once we start processing
        imgElement.style.display = 'block';
        loadingEl.style.display = 'none';
        
        // Frame reading loop
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Append new data to buffer
          const newBuffer = new Uint8Array(buffer.length + value.length);
          newBuffer.set(buffer);
          newBuffer.set(value, buffer.length);
          buffer = newBuffer;
          
          // Process frames in buffer
          const frameStart = this._findNextFrame(buffer, boundary);
          if (frameStart > 0) {
            const frameEnd = this._findNextFrame(buffer.subarray(frameStart + 1), boundary);
            
            if (frameEnd > 0) {
              const frame = buffer.subarray(frameStart, frameStart + frameEnd + 1);
              const imgBlob = this._extractJpegFromFrame(frame);
              
              if (imgBlob) {
                imgElement.src = URL.createObjectURL(imgBlob);
                // Clean up previous blob to prevent memory leaks
                if (imgElement._blobUrl) {
                  URL.revokeObjectURL(imgElement._blobUrl);
                }
                imgElement._blobUrl = imgElement.src;
              }
              
              // Remove processed frame from buffer
              buffer = buffer.subarray(frameStart + frameEnd + 1);
            }
          }
          
          // Safety check to prevent buffer from growing too large
          if (buffer.length > 10000000) { // 10MB limit
            console.warn('Buffer size exceeded, resetting');
            buffer = new Uint8Array(0);
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('MJPEG stream aborted');
        } else {
          console.error('MJPEG stream error:', error);
          loadingEl.textContent = `Stream error: ${error.message}`;
          loadingEl.style.display = 'block';
          imgElement.style.display = 'none';
          throw error; // Rethrow to trigger fallback
        }
      }
    };
    
    // Extract boundary from content type
    this._extractBoundary = (contentType) => {
      const matches = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      if (!matches) {
        return '--boundary';
      }
      return '--' + (matches[1] || matches[2]);
    };
    
    // Find the next frame boundary in the buffer
    this._findNextFrame = (buffer, boundary) => {
      const boundaryBytes = new TextEncoder().encode(boundary);
      let foundIndex = -1;
      
      // Search for boundary sequence
      for (let i = 0; i <= buffer.length - boundaryBytes.length; i++) {
        if (buffer[i] === boundaryBytes[0]) {
          let found = true;
          for (let j = 1; j < boundaryBytes.length; j++) {
            if (buffer[i+j] !== boundaryBytes[j]) {
              found = false;
              break;
            }
          }
          if (found) {
            foundIndex = i;
            break;
          }
        }
      }
      
      return foundIndex;
    };
    
    // Extract JPEG from frame
    this._extractJpegFromFrame = (frameData) => {
      // Find the JPEG start marker (FFD8)
      let jpegStart = -1;
      for (let i = 0; i < frameData.length - 1; i++) {
        if (frameData[i] === 0xFF && frameData[i+1] === 0xD8) {
          jpegStart = i;
          break;
        }
      }
      
      if (jpegStart === -1) return null;
      
      // Find the JPEG end marker (FFD9)
      let jpegEnd = -1;
      for (let i = frameData.length - 2; i >= 0; i--) {
        if (frameData[i] === 0xFF && frameData[i+1] === 0xD9) {
          jpegEnd = i + 2; // Include the marker
          break;
        }
      }
      
      if (jpegEnd === -1) return null;
      
      // Create blob from JPEG data
      return new Blob([frameData.subarray(jpegStart, jpegEnd)], { type: 'image/jpeg' });
    };
    
    // Simpler alternative implementation for smaller, single-image approach
    this._fetchSingleFrame = async (url, imgElement, loadingEl, signal) => {
      try {
        // Use single frame endpoint if available, otherwise use stream endpoint
        const singleFrameUrl = url.replace('/stream', '/snapshot');
        
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await this._hass.fetchWithAuth(`${singleFrameUrl}?t=${timestamp}`, {
          method: 'GET',
          signal: signal,
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        // Clean up previous blob URL
        if (imgElement._blobUrl) {
          URL.revokeObjectURL(imgElement._blobUrl);
        }
        
        // Create and set new blob URL
        const blobUrl = URL.createObjectURL(blob);
        imgElement.src = blobUrl;
        imgElement._blobUrl = blobUrl;
        
        imgElement.style.display = 'block';
        loadingEl.style.display = 'none';
        
        // If not aborted, fetch the next frame
        if (!signal.aborted) {
          setTimeout(() => {
            this._fetchSingleFrame(url, imgElement, loadingEl, signal);
          }, 100); // 10 fps
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Stream aborted');
        } else {
          console.error('Error fetching frame:', error);
          loadingEl.textContent = 'Stream error. Please try again.';
          loadingEl.style.display = 'block';
          imgElement.style.display = 'none';
        }
      }
    };
    
    // Function to stop streaming
    this._stopStream = () => {
      if (this._statusInterval) {
        clearInterval(this._statusInterval);
        this._statusInterval = null;
      }
      
      // Abort the MJPEG streaming
      if (mjpegController) {
        mjpegController.abort();
        mjpegController = null;
      }
      
      // Clean up blob URL
      if (videoImg._blobUrl) {
        URL.revokeObjectURL(videoImg._blobUrl);
        videoImg._blobUrl = null;
      }
      
      // Send request to stop the stream on the device
      this._hass.fetchWithAuth(`/api/esp32_robot/proxy/${entityId}/stopstream`, {
        method: 'GET',
        cache: 'no-store',
      }).catch(error => {
        console.error('Error stopping stream:', error);
      });
      
      isStreaming = false;
      streamButton.textContent = 'Start Stream';
      videoImg.src = '';
      videoImg.style.display = 'none';
      loadingEl.style.display = 'block';
      loadingEl.textContent = 'Click Start Stream button below';
    };
    
    // Initialize button click
    streamButton.addEventListener('click', () => {
      if (isStreaming) {
        this._stopStream();
      } else {
        startStream();
      }
    });
    
    // Do not start stream by default, just show the placeholder
    loadingEl.textContent = 'Click Start Stream button below';
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
}

customElements.define("esp32-robot-card", ESP32RobotCard);

// Для HACS и регистрации карточки
window.customCards = window.customCards || [];
window.customCards.push({
  type: "esp32-robot-card",
  name: "ESP32 Robot Card",
  description: "A card to monitor and control an ESP32 Robot"
}); 
