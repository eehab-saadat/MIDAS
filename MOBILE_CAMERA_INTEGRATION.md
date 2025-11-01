# Mobile Camera Integration Guide

## Overview
This feature allows healthcare professionals to capture lab results and medical imagery using their mobile phone camera and seamlessly upload them to the patient session on their desktop computer - no Bluetooth pairing required!

## How It Works

```
┌─────────────┐          ┌──────────────┐          ┌─────────────┐
│   Desktop   │          │   Backend    │          │   Mobile    │
│   Browser   │          │   Server     │          │   Device    │
└─────┬───────┘          └──────┬───────┘          └──────┬──────┘
      │                         │                         │
      │  1. Generate QR Code    │                         │
      │────────────────────────>│                         │
      │                         │                         │
      │  2. Display QR Code     │                         │
      │<────────────────────────│                         │
      │                         │                         │
      │                         │   3. Scan QR Code       │
      │                         │<────────────────────────│
      │                         │                         │
      │                         │   4. Open Mobile App    │
      │                         │<────────────────────────│
      │                         │                         │
      │                         │   5. Capture Photo      │
      │                         │<────────────────────────│
      │                         │                         │
      │                         │   6. Upload Image       │
      │                         │<────────────────────────│
      │                         │                         │
      │  7. Poll for New Images │                         │
      │────────────────────────>│                         │
      │                         │                         │
      │  8. Receive Image Data  │                         │
      │<────────────────────────│                         │
      │                         │                         │
      │  9. Add to Session      │                         │
      │  Entries Automatically  │                         │
      └─────────────────────────┘                         │
```

## Features

### ✅ Desktop Side
- **QR Code Generation**: Unique session-based QR code for each patient session
- **Smartphone Button**: Click to show/hide QR code
- **Auto-Polling**: Automatically checks for new images every 2 seconds
- **Seamless Integration**: Images appear as session entries automatically
- **Real-time Updates**: No manual refresh required

### ✅ Mobile Side
- **Camera Access**: Uses device's back camera for optimal photo quality
- **Photo Preview**: Review captured images before uploading
- **Retake Option**: Easy retake if photo quality is poor
- **Upload Progress**: Clear feedback during upload process
- **Success Confirmation**: Visual confirmation when image is uploaded

### ✅ Security & Performance
- **Session-Based**: Each session has a unique ID
- **Auto-Cleanup**: Old images (>1 hour) automatically deleted
- **In-Memory Storage**: Fast performance with automatic memory management
- **No Login Required**: Seamless mobile experience

## Usage Instructions

### For Healthcare Professionals (Desktop)

1. **Open Patient Session**
   - Navigate to patient detail page
   - Go to the Session Entries section

2. **Activate Mobile Camera**
   - Click the 📱 **Smartphone** button next to the Add button
   - A QR code will appear in a blue card

3. **Scan QR Code**
   - Use your mobile phone camera to scan the QR code
   - Or manually open the URL shown on another device

4. **Wait for Images**
   - Keep the QR code displayed while capturing images
   - Images will automatically appear as session entries
   - You'll see them with "Imaging" badge

5. **Close When Done**
   - Click the "Close" button to hide QR code
   - Polling will stop to save resources

### For Mobile Device Users

1. **Scan QR Code**
   - Point your phone camera at the QR code
   - Tap the notification to open the link

2. **Allow Camera Access**
   - Click "Start Camera" button
   - Grant camera permission when prompted

3. **Capture Image**
   - Point camera at lab result or medical image
   - Click the large camera button to capture
   - Review the captured image

4. **Upload or Retake**
   - **Upload**: Sends image to desktop session
   - **Retake**: Captures a new photo

5. **Success Confirmation**
   - Green checkmark indicates successful upload
   - Automatically ready for next capture

## Technical Implementation

### Components

#### 1. Desktop Component (`session-instance.tsx`)
```typescript
// Features:
- QR code generation with unique session ID
- Polling mechanism (every 2 seconds)
- Auto-add images as entries
- Clean up consumed images
```

#### 2. Mobile Page (`mobile-camera/page.tsx`)
```typescript
// Features:
- Camera access with environment (back) camera
- Canvas-based image capture
- Base64 encoding
- Form data upload
```

#### 3. API Endpoint (`api/mobile-upload/route.ts`)
```typescript
// Endpoints:
- POST: Upload images from mobile
- GET: Fetch pending images for session
- DELETE: Clear consumed images
```

### Data Flow

1. **Session Creation**
   ```typescript
   const uniqueId = `session_${Date.now()}_${Math.random()}`;
   const mobileUrl = `${baseUrl}/mobile-camera?session=${uniqueId}`;
   ```

2. **Image Upload** (Mobile → Backend)
   ```typescript
   FormData {
     image: Blob,
     session_id: string
   }
   ```

3. **Image Storage** (Backend)
   ```typescript
   Map<sessionId, Array<{
     id: string,
     fileName: string,
     fileType: string,
     base64Data: string,
     timestamp: number
   }>>
   ```

4. **Polling** (Desktop ← Backend)
   ```typescript
   GET /api/mobile-upload?session_id=${sessionId}
   Response: { images: [...] }
   ```

5. **Entry Creation** (Desktop)
   ```typescript
   {
     id: imageId,
     type: "imaging",
     date: timestamp,
     content: {
       file_name: string,
       file_type: string,
       base64_data: string
     }
   }
   ```

## File Locations

```
MIDAS/
├── frontend/
│   ├── components/
│   │   └── session-instance.tsx        [MODIFIED] - Added QR code & polling
│   ├── app/
│   │   ├── mobile-camera/
│   │   │   └── page.tsx                [NEW] - Mobile camera page
│   │   └── api/
│   │       └── mobile-upload/
│   │           └── route.ts            [NEW] - Upload API
│   └── package.json                    [MODIFIED] - Added qrcode.react
```

## Configuration

### Polling Interval
Adjust polling frequency in `session-instance.tsx`:
```typescript
const pollInterval = setInterval(async () => {
  // ... polling logic
}, 2000); // Change this value (milliseconds)
```

### Image Cleanup Time
Modify auto-cleanup duration in `api/mobile-upload/route.ts`:
```typescript
const oneHourAgo = Date.now() - (60 * 60 * 1000); // Change this duration
```

### QR Code Size
Adjust QR code size in `session-instance.tsx`:
```typescript
<QRCode value={mobileUrl} size={150} /> // Change size prop
```

## Browser Compatibility

### Desktop
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Mobile
- ✅ iOS Safari 14+
- ✅ Android Chrome 90+
- ✅ Samsung Internet 14+

## Limitations & Considerations

### Current Implementation
1. **In-Memory Storage**: Images stored in server memory
   - **Pro**: Fast and simple
   - **Con**: Lost on server restart
   - **Production**: Use Redis, database, or cloud storage

2. **Polling**: Desktop polls every 2 seconds
   - **Pro**: Simple and reliable
   - **Con**: Continuous network requests
   - **Alternative**: Use WebSockets for push notifications

3. **No Authentication**: Mobile page doesn't require login
   - **Pro**: Fast and convenient
   - **Con**: Anyone with QR code can upload
   - **Improvement**: Add time-limited tokens or PINs

4. **Session Management**: Sessions live for 1 hour
   - **Configurable**: Adjust cleanup time as needed

## Production Recommendations

### 1. Persistent Storage
Replace in-memory Map with Redis or database:

```typescript
// Using Redis
import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

// Store image
await redis.setex(`session:${sessionId}`, 3600, JSON.stringify(images));
```

### 2. WebSocket Integration
Replace polling with WebSocket for real-time updates:

```typescript
// Server-side
io.on('connection', (socket) => {
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
  });
});

// On image upload
io.to(sessionId).emit('new-image', imageData);
```

### 3. Image Compression
Compress images before upload to save bandwidth:

```typescript
// Use canvas to compress
const compressImage = (base64, quality = 0.7) => {
  const canvas = document.createElement('canvas');
  const img = new Image();
  img.src = base64;
  // ... compression logic
  return canvas.toDataURL('image/jpeg', quality);
};
```

### 4. Security Enhancements
- Add session expiration tokens
- Implement rate limiting
- Add CSRF protection
- Validate image types and sizes
- Scan for malicious content

## Troubleshooting

### QR Code Not Appearing
- **Check**: Browser console for errors
- **Solution**: Ensure component is mounted (isMounted = true)
- **Verify**: Session ID is generated correctly

### Camera Not Working on Mobile
- **Check**: HTTPS connection (required for camera access)
- **Solution**: Enable camera permissions in browser settings
- **Verify**: Use supported browser

### Images Not Appearing on Desktop
- **Check**: Network tab for failed API requests
- **Solution**: Verify polling is active (showMobileQR = true)
- **Verify**: Session ID matches between devices

### Upload Fails
- **Check**: Image size (very large images may fail)
- **Solution**: Implement compression
- **Verify**: Backend endpoint is accessible

## Future Enhancements

1. **Multiple Images**: Support batch upload of multiple images
2. **Image Editing**: Crop, rotate, and adjust brightness
3. **OCR Integration**: Automatic text extraction from lab reports
4. **Voice Notes**: Add audio annotations to images
5. **Image Categories**: Automatically categorize (lab vs imaging vs wound photos)
6. **Annotations**: Draw on images to highlight areas of interest
7. **Patient Consent**: Require patient consent before mobile capture
8. **DICOM Support**: Handle medical imaging standards

## Benefits

✅ **No App Installation**: Works in mobile browser
✅ **No Pairing**: No Bluetooth or WiFi pairing needed
✅ **Cross-Platform**: Works on iOS and Android
✅ **Instant Sync**: Real-time updates
✅ **Easy Workflow**: Minimal steps for capture
✅ **Cost-Effective**: No specialized hardware needed

## Summary

The mobile camera integration provides a seamless way to capture and upload medical images using any smartphone. The QR code-based approach eliminates the complexity of Bluetooth pairing while providing instant synchronization between devices.

Perfect for:
- 📋 Lab result documentation
- 🏥 Medical imagery capture
- 💊 Medication packaging photos
- 📊 Chart and graph documentation
- 🔬 Specimen imaging

**No Bluetooth Required** ✨ - Just scan, capture, and upload!

