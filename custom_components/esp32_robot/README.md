# ESP32 Robot for Home Assistant

This integration allows you to monitor and control your ESP32-based robots through Home Assistant.

## Features

- Monitor robot status (online/offline)
- View camera stream from robot
- Control robot movement through intuitive UI
- Secure video streaming with signed URLs
- Native Home Assistant Lovelace card

## Security Features

### Secure Streaming

The ESP32 Robot integration implements secure video streaming using Home Assistant's signed URL feature. This ensures that:

1. **Authorization Required**: All streams are protected by Home Assistant's authentication system.
2. **Signed URLs**: The integration generates time-limited signed URLs for streams using Home Assistant's WebSocket API, which can be used even in contexts where standard authentication headers aren't supported (like `<img>` tags).
3. **Limited Validity**: Signed URLs expire after about 2 minutes by default, with automatic renewal in the frontend.
4. **Proxy Protection**: All communication with your ESP32 robot goes through Home Assistant's proxy system, avoiding direct exposure of your robot's IP address to clients.

This security model ensures that your robot's video stream can only be accessed by authorized users, even when embedded in cards or shared within your Home Assistant dashboard.

### Authentication Technical Details

The integration uses Home Assistant's built-in WebSocket API for generating signed URLs:

1. The frontend uses the `auth/sign_path` WebSocket command to generate a signed URL:
   ```javascript
   const message = {
     id: messageId,
     type: "auth/sign_path",
     path: "/api/esp32_robot/proxy/{robot_id}/stream",
     expires: 110 // seconds
   };
   ```

2. Home Assistant returns a signed URL that includes an `authSig` parameter.

3. The frontend uses this signed URL in the `<img>` tag to display the stream.

4. Home Assistant's built-in authentication system validates the `authSig` parameter when the URL is accessed.

5. The frontend automatically refreshes the signed URL before it expires to ensure uninterrupted streaming.

This approach follows Home Assistant's recommended security practices for handling authenticated streams.

## Usage

### Viewing Stream

The stream is securely displayed in the control interface that opens when you click the "Control Interface" button on the ESP32 Robot card. The stream is loaded using a secure signed URL that doesn't require you to expose your robot directly to the internet.

### Embedding Stream in Other Cards

If you want to embed the robot's stream in other cards or UIs, you should always use the WebSocket API to get a signed URL:

```javascript
// Example of how to get a signed URL for a stream using WebSocket
const messageId = Math.floor(Math.random() * 1000);
const message = {
  id: messageId,
  type: "auth/sign_path",
  path: `/api/esp32_robot/proxy/${robotId}/stream`,
  expires: 110 // seconds
};

// Set up event listener for response
const handleMessage = (event) => {
  const response = JSON.parse(event.data);
  if (response.id === messageId && response.success) {
    const signedUrl = response.result.path;
    document.getElementById('my-stream-img').src = signedUrl;
  }
};

// Send WebSocket message
hass.connection.addEventListener('message', handleMessage);
hass.connection.sendMessage(message);
```

## Troubleshooting

### Stream Not Loading

If the stream isn't loading, check:

1. The robot is online (check the status on the card)
2. Your Home Assistant instance can reach the robot's IP address
3. The robot's stream endpoint is functioning properly

### Security Issues

If you're having issues with stream authentication:

1. Make sure you're using the WebSocket API to generate signed URLs
2. Check that your Home Assistant authentication is working properly
3. Verify that your signed URLs aren't expired (they only last about 2 minutes)
4. Check the browser console for any errors related to WebSocket communication

## Advanced Configuration

The integration automatically manages secure streaming. No additional configuration is needed for standard usage. 