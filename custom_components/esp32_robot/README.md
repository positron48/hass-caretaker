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
2. **Signed URLs**: The integration generates time-limited signed URLs for streams, which can be used even in contexts where standard authentication headers aren't supported (like `<img>` tags).
3. **Limited Validity**: Signed URLs expire after 2 minutes by default, requiring clients to refresh them periodically.
4. **Proxy Protection**: All communication with your ESP32 robot goes through Home Assistant's proxy system, avoiding direct exposure of your robot's IP address to clients.
5. **Dual Authentication**: The integration supports both standard Home Assistant authentication tokens and signed URLs, giving you flexibility in how you access streams.

This security model ensures that your robot's video stream can only be accessed by authorized users, even when embedded in cards or shared within your Home Assistant dashboard.

### Authentication Technical Details

The integration uses Home Assistant's built-in `auth_signature_valid` mechanism to verify signed URLs. When Home Assistant receives a request with an `authSig` parameter in the URL:

1. It automatically validates the signature
2. If valid, it sets `request["auth_signature_valid"] = True`
3. Our integration checks either for a standard authenticated user (`hass_user`) or a valid signature (`auth_signature_valid`)
4. If neither is present, it returns a 401 Unauthorized response

This approach follows Home Assistant's recommended security practices for handling authenticated streams.

## Usage

### Viewing Stream

The stream is securely displayed in the control interface that opens when you click the "Control Interface" button on the ESP32 Robot card. The stream is loaded using a secure signed URL that doesn't require you to expose your robot directly to the internet.

### Embedding Stream in Other Cards

If you want to embed the robot's stream in other cards or UIs, you should always use the signed URL API to get a secure URL:

```javascript
// Example of how to get a signed URL for a stream
const response = await hass.fetchWithAuth(`/api/esp32_robot/get_signed_url?id=${robotId}`);
const data = await response.json();
const signedUrl = data.signed_url;

// Now you can use this URL in an img tag
document.getElementById('my-stream-img').src = signedUrl;
```

## Troubleshooting

### Stream Not Loading

If the stream isn't loading, check:

1. The robot is online (check the status on the card)
2. Your Home Assistant instance can reach the robot's IP address
3. The robot's stream endpoint is functioning properly

### Security Issues

If you're having issues with stream authentication:

1. Make sure you're using the signed URL API and not trying to access the stream directly
2. Check that your Home Assistant authentication is working properly
3. Verify that your signed URLs aren't expired (they only last 2 minutes)

## API Documentation

### Get Signed URL

`GET /api/esp32_robot/get_signed_url?id={robot_id}`

Returns a JSON object containing:
- `signed_url`: The signed URL that can be used to access the stream
- `expires_in`: How long the URL is valid for (in seconds)
- `robot_id`: The ID of the robot
- `ip_address`: The IP address of the robot
- `state`: The current state of the robot

This endpoint requires Home Assistant authentication.

## Advanced Configuration

The integration automatically manages secure streaming. No additional configuration is needed for standard usage. 