# ESP32 Robot for Home Assistant

This integration allows you to monitor and control your ESP32-based robots through Home Assistant.

## Features

- Monitor robot status (online/offline)
- View camera stream from robot with secure authentication
- Control robot movement through intuitive joystick interface
- Adjust camera settings (resolution, quality) and LED brightness
- Secure video streaming with signed URLs
- Native Home Assistant Lovelace card
- Full screen mode support

## Control Interface

The ESP32 Robot card provides a modern and intuitive control interface:

- **Immersive Video Stream**: Full screen video display with overlay controls
- **Responsive Joystick**: Precision control with normalized -1 to 1 float values for smooth robot movement
- **Settings Panel**: Slide-out panel to adjust:
  - Camera resolution with multiple preset options
  - Image quality slider (8-64) with visual feedback
  - LED brightness control (0-100%)
- **FPS Display**: Real-time frames-per-second counter with one decimal place precision

## Security Features

### Secure Streaming

The ESP32 Robot integration implements secure video streaming using Home Assistant's signed URL feature. This ensures that:

1. **Authorization Required**: All streams are protected by Home Assistant's authentication system.
2. **Signed URLs**: The integration uses Home Assistant's WebSocket API to generate time-limited signed URLs for streams, which can be used even in contexts where standard authentication headers aren't supported (like `<img>` tags).
3. **Limited Validity**: Signed URLs include an expiration timestamp and are validated by Home Assistant.
4. **Proxy Protection**: All communication with your ESP32 robot goes through Home Assistant's proxy system, avoiding direct exposure of your robot's IP address to clients.

This security model ensures that your robot's video stream can only be accessed by authorized users, even when embedded in cards or shared within your Home Assistant dashboard.

### Authentication Technical Details

The integration uses Home Assistant's built-in WebSocket API for generating signed URLs:

1. When a user requests to view the stream, the frontend sends a WebSocket message to get a signed URL:
   ```javascript
   const result = await this._hass.connection.sendMessagePromise({
     type: "auth/sign_path",
     path: `/api/esp32_robot/proxy/${robotId}/stream`,
     expires: 300 // 5 minutes
   });
   ```

2. Home Assistant returns a signed URL that includes an `authSig` parameter containing a JWT token.

3. The signed URL is used directly in the `<img>` tag to display the stream:
   ```javascript
   videoImg.src = this._hass.hassUrl(signedUrl);
   ```

4. When the browser requests the image, Home Assistant validates the `authSig` parameter before proxying the request to the robot.

5. Authentication is only checked at the beginning of the MJPEG stream, after which the stream continues until closed.

## Usage

### Viewing Stream

The stream is securely displayed in the control interface that opens when you click the "Control Interface" button on the ESP32 Robot card. The stream is loaded using a secure signed URL that doesn't require you to expose your robot directly to the internet.

### Joystick Control

The integrated joystick provides intuitive control of your robot:
- Click anywhere in the joystick area to position the handle
- Drag the handle to steer your robot
- Release to automatically center the joystick and stop movement
- Smooth, normalized values (-1 to 1) for precise control

### Camera Settings

Adjust camera settings through the slide-out settings panel:
- **Resolution**: Select from multiple preset resolutions (QQVGA to UXGA)
- **Quality**: Adjust image compression with real-time feedback
- **LED Control**: Set LED brightness from 0-100%

### MJPEG Streaming Performance

The implementation includes several optimizations for MJPEG streaming:

1. **No Timeout**: Long-running MJPEG streams are configured to run without a timeout.
2. **Buffer Size Optimization**: Uses an optimized buffer size (4096 bytes) for better performance.
3. **Error Handling**: Comprehensive error handling for network issues, disconnections, and other stream problems.
4. **Connection Management**: Proper management of connections to avoid resource leaks.
5. **FPS Monitoring**: Real-time FPS display with one decimal place precision.

## Troubleshooting

### Stream Not Loading

If the stream isn't loading, check:

1. The robot is online (check the status on the card)
2. Your Home Assistant instance can reach the robot's IP address
3. The robot's stream endpoint is functioning properly
4. Click the "Start Stream" button in the control interface

### Joystick Issues

If the joystick isn't responding properly:

1. Ensure the robot is online
2. Check browser console for any errors
3. Try using a different browser if touch controls are not working

### Security Issues

If you're having issues with stream authentication:

1. Check that your Home Assistant authentication is working properly
2. Verify that the robot is online and accessible
3. Check the browser console for any errors related to image loading

## Advanced Configuration

The integration automatically manages secure streaming. No additional configuration is needed for standard usage. 