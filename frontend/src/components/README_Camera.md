# Camera Functionality

This document describes the camera functionality added to the Acadion platform.

## Overview

The camera functionality allows users to take photos directly from their devices instead of only uploading files. This is particularly useful for mobile users and provides a more seamless experience.

## Components

### CameraCapture Component

A reusable modal component that provides camera functionality with the following features:

- **Camera Access**: Requests camera permissions and displays live video feed
- **Photo Capture**: Captures photos and converts them to File objects
- **Camera Switching**: Allows switching between front and back cameras (when multiple cameras are available)
- **Error Handling**: Graceful handling of camera permission denials and errors
- **Responsive Design**: Works on both desktop and mobile devices

### useCamera Hook

A custom hook that provides camera capability detection:

- **Camera Detection**: Checks if cameras are available
- **Multiple Camera Detection**: Detects if multiple cameras are available
- **Browser Support**: Checks if the browser supports camera APIs
- **Error Handling**: Provides error states for unsupported browsers

## Integration

The camera functionality has been integrated into the following pages:

### 1. Face Registration (`FaceRegistration.tsx`)
- Students can take a photo for face registration
- Fallback to file upload if camera is not available

### 2. Attendance Upload (`AttendanceUpload.tsx`)
- Teachers can take class photos for attendance marking
- Supports both camera capture and file upload

### 3. Take Attendance (`TakeAttendance.tsx`)
- Real-time attendance marking with camera
- Integrated with face recognition processing

### 4. Student Registration (`StudentRegister.tsx`)
- Profile photo capture during student registration
- Optional camera usage with file upload fallback

## Browser Compatibility

The camera functionality uses the modern `getUserMedia` API and is supported in:

- Chrome 53+
- Firefox 36+
- Safari 11+
- Edge 12+

For unsupported browsers, the system gracefully falls back to file upload only.

## Security Considerations

- Camera permissions are requested only when needed
- Photos are processed locally before being sent to the server
- Camera streams are properly cleaned up when components unmount
- No video recording - only photo capture

## Mobile Considerations

- Uses front camera by default for face registration
- Allows switching to back camera for group photos
- Responsive design adapts to mobile screen sizes
- Touch-friendly capture buttons

## Usage Example

```tsx
import CameraCapture from '../components/CameraCapture';

const MyComponent = () => {
  const [showCamera, setShowCamera] = useState(false);
  
  const handleCapture = (file: File) => {
    // Process the captured photo
    console.log('Captured photo:', file);
  };

  return (
    <>
      <button onClick={() => setShowCamera(true)}>
        Take Photo
      </button>
      
      <CameraCapture
        isOpen={showCamera}
        onCapture={handleCapture}
        onClose={() => setShowCamera(false)}
        title="Take Photo"
        instructions="Position yourself in the frame"
      />
    </>
  );
};
```

## Future Enhancements

- Video recording for attendance verification
- Real-time face detection overlay
- Photo quality validation
- Automatic photo optimization
- Batch photo capture for multiple students