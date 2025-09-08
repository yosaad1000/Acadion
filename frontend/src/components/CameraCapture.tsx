import React, { useRef, useState, useCallback } from 'react';
import { CameraIcon, XMarkIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useCamera } from '../hooks/useCamera';

interface CameraCaptureProps {
    onCapture: (file: File) => void;
    onClose: () => void;
    isOpen: boolean;
    title?: string;
    instructions?: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
    onCapture,
    onClose,
    isOpen,
    title = "Take Photo",
    instructions = "Position yourself in the frame and click capture"
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string>('');
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const { hasCamera, hasMultipleCameras, isSupported } = useCamera();

    const startCamera = useCallback(async () => {
        try {
            setError('');

            // Stop existing stream if any
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setIsStreaming(true);
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Unable to access camera. Please check permissions and try again.');
        }
    }, [facingMode]);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsStreaming(false);
    }, []);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `photo-${Date.now()}.jpg`, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                });
                onCapture(file);
                handleClose();
            }
        }, 'image/jpeg', 0.8);
    }, [onCapture]);

    const switchCamera = useCallback(() => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    }, []);

    const handleClose = useCallback(() => {
        stopCamera();
        setError('');
        onClose();
    }, [stopCamera, onClose]);

    // Start camera when modal opens
    React.useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isOpen, startCamera, stopCamera]);

    // Restart camera when facing mode changes
    React.useEffect(() => {
        if (isOpen && isStreaming) {
            startCamera();
        }
    }, [facingMode, isOpen, isStreaming, startCamera]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />

                {/* Modal panel */}
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    {/* Header */}
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                {title}
                            </h3>
                            <button
                                onClick={handleClose}
                                className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        {!isSupported && (
                            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                                <div className="flex items-center">
                                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                                    <p className="text-sm text-red-600">Camera not supported in this browser</p>
                                </div>
                            </div>
                        )}

                        {isSupported && !hasCamera && (
                            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                <div className="flex items-center">
                                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
                                    <p className="text-sm text-yellow-600">No camera detected. Please connect a camera or use file upload.</p>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                                <p className="text-sm text-red-600">{error}</p>
                                <button
                                    onClick={startCamera}
                                    className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {/* Camera view */}
                        <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                            <video
                                ref={videoRef}
                                className="w-full h-full object-cover"
                                playsInline
                                muted
                            />

                            {!isStreaming && !error && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                    <div className="text-center text-white">
                                        <CameraIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm opacity-75">Starting camera...</p>
                                    </div>
                                </div>
                            )}

                            {/* Camera controls overlay */}
                            {isStreaming && (
                                <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center space-x-4">
                                    {/* Switch camera button (only show if multiple cameras available) */}
                                    {hasMultipleCameras && (
                                        <button
                                            onClick={switchCamera}
                                            className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                                            title="Switch camera"
                                        >
                                            <ArrowPathIcon className="h-5 w-5" />
                                        </button>
                                    )}

                                    {/* Capture button */}
                                    <button
                                        onClick={capturePhoto}
                                        className="bg-white text-gray-900 p-4 rounded-full hover:bg-gray-100 transition-all shadow-lg"
                                        title="Take photo"
                                    >
                                        <CameraIcon className="h-6 w-6" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Instructions */}
                        <p className="mt-3 text-sm text-gray-600 text-center">
                            {instructions}
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            onClick={handleClose}
                            className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>

            {/* Hidden canvas for photo capture */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default CameraCapture;