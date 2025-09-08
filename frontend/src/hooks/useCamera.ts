import { useState, useEffect } from 'react';

interface CameraInfo {
  hasCamera: boolean;
  hasMultipleCameras: boolean;
  isSupported: boolean;
  error: string | null;
}

export const useCamera = (): CameraInfo => {
  const [cameraInfo, setCameraInfo] = useState<CameraInfo>({
    hasCamera: false,
    hasMultipleCameras: false,
    isSupported: false,
    error: null
  });

  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraInfo({
            hasCamera: false,
            hasMultipleCameras: false,
            isSupported: false,
            error: 'Camera API not supported in this browser'
          });
          return;
        }

        // Check for available cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        setCameraInfo({
          hasCamera: videoDevices.length > 0,
          hasMultipleCameras: videoDevices.length > 1,
          isSupported: true,
          error: null
        });
      } catch (error) {
        setCameraInfo({
          hasCamera: false,
          hasMultipleCameras: false,
          isSupported: false,
          error: 'Failed to check camera availability'
        });
      }
    };

    checkCameraSupport();
  }, []);

  return cameraInfo;
};