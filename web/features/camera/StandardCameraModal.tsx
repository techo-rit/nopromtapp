/**
 * components/StandardCameraModal.tsx
 * * A professional, lightweight camera modal for capturing objects/wearables.
 * - Mobile: Defaults to Back Camera (Environment)
 * - Desktop: Defaults to Front/Available Webcam
 * - No Face Detection AI (High Performance)
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';

interface StandardCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

export const StandardCameraModal: React.FC<StandardCameraModalProps> = ({
    isOpen,
    onClose,
    onCapture,
}) => {
    const webcamRef = useRef<Webcam>(null);
    const [flashActive, setFlashActive] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setFlashActive(false);
            setIsCapturing(false);
        }
    }, [isOpen]);

    const performCapture = useCallback(() => {
        if (!webcamRef.current || isCapturing) return;

        setIsCapturing(true);
        setFlashActive(true);

        // Small delay to ensure flash visual triggers before processing
        setTimeout(() => {
            const imageSrc = webcamRef.current?.getScreenshot();
            
            if (imageSrc) {
                // Convert Base64 to File object
                fetch(imageSrc)
                    .then(res => res.blob())
                    .then(blob => {
                        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                        onCapture(file);
                        
                        // Close modal after short success delay
                        setTimeout(onClose, 300);
                    })
                    .catch(() => {
                        setIsCapturing(false);
                        setFlashActive(false);
                    });
            } else {
                setIsCapturing(false);
                setFlashActive(false);
            }
        }, 100);
    }, [onCapture, onClose, isCapturing]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
            style={{ height: '100dvh' }}
        >
            {/* Flash Effect Layer */}
            <div
                className={`absolute inset-0 z-[60] bg-white pointer-events-none transition-opacity duration-200 ${flashActive ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute right-6 z-50 p-4 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
                style={{ top: 'calc(1.5rem + env(safe-area-inset-top))' }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* Camera Viewport */}
            <div className="relative w-full h-full flex items-center justify-center bg-black">
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                        // THIS IS KEY: Requests back camera on mobile, falls back to front on laptop
                        facingMode: { ideal: "environment" }, 
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    }}
                    // Mirroring: False looks more natural for objects/text, True is better for selfies
                    mirrored={false} 
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Controls Layer */}
            <div
                className="absolute inset-x-0 flex flex-col items-center justify-end pb-8 z-50"
                style={{ bottom: 'env(safe-area-inset-bottom)' }}
            >
                <p className="text-white/80 font-medium mb-6 text-shadow-sm">
                    Position item and tap to capture
                </p>

                {/* Shutter Button */}
                <button
                    onClick={performCapture}
                    disabled={isCapturing}
                    aria-label="Take Photo"
                    className="relative group transition-transform active:scale-95"
                >
                    <div className="w-20 h-20 rounded-full border-[5px] border-white flex items-center justify-center shadow-lg bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                        <div className="w-16 h-16 bg-white rounded-full transition-transform group-hover:scale-90" />
                    </div>
                </button>
            </div>
        </div>
    );
};