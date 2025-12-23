import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FaceDetector, FilesetResolver, Detection } from '@mediapipe/tasks-vision';

interface SmartSelfieModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

// Detailed status for better user feedback
type AlignmentStatus = 
    | 'LOADING' 
    | 'NO_FACE' 
    | 'TOO_CLOSE' 
    | 'TOO_FAR' 
    | 'CENTER_FACE' 
    | 'TILT_HEAD' 
    | 'HOLD_STILL' 
    | 'CAPTURING';

export const SmartSelfieModal: React.FC<SmartSelfieModalProps> = ({
    isOpen,
    onClose,
    onCapture,
}) => {
    const webcamRef = useRef<Webcam>(null);
    const detectorRef = useRef<FaceDetector | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    
    // State
    const [status, setStatus] = useState<AlignmentStatus>('LOADING');
    const [progress, setProgress] = useState(0); // 0 to 100
    const [flashActive, setFlashActive] = useState(false);
    const [isDetectorReady, setIsDetectorReady] = useState(false);

    // Refs for logic (to avoid re-renders during high-speed loop)
    const holdStartTimeRef = useRef<number | null>(null);
    const lastStatusRef = useRef<AlignmentStatus>('LOADING');

    // Constants
    const HOLD_DURATION_MS = 1500; // Hold for 1.5 seconds
    const FACE_WIDTH_RATIO_MIN = 0.20; // Min face size (20% of screen)
    const FACE_WIDTH_RATIO_MAX = 0.55; // Max face size (55% of screen)
    const CENTER_TOLERANCE = 0.15; // How close to center (15%)
    const TILT_TOLERANCE = 5; // Degrees of tilt allowed

    // Initialize MediaPipe
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const initializeDetector = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
                );
                const detector = await FaceDetector.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
                        delegate: 'GPU',
                    },
                    runningMode: 'VIDEO',
                });
                if (isMounted) {
                    detectorRef.current = detector;
                    setIsDetectorReady(true);
                    setStatus('NO_FACE');
                }
            } catch (error) {
                console.error('Failed to initialize face detector:', error);
                if (isMounted) setStatus('NO_FACE');
            }
        };

        initializeDetector();

        return () => {
            isMounted = false;
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (detectorRef.current) {
                detectorRef.current.close();
                detectorRef.current = null;
            }
            setIsDetectorReady(false);
            setProgress(0);
        };
    }, [isOpen]);

    // Calculate alignment status
    const checkAlignment = useCallback((detection: Detection, videoWidth: number, videoHeight: number): AlignmentStatus => {
        const bbox = detection.boundingBox;
        if (!bbox) return 'NO_FACE';

        const { originX, originY, width, height } = bbox;
        const centerX = originX + width / 2;
        const centerY = originY + height / 2;

        // 1. Check Distance (Size of face relative to screen)
        const widthRatio = width / videoWidth;
        if (widthRatio < FACE_WIDTH_RATIO_MIN) return 'TOO_FAR';
        if (widthRatio > FACE_WIDTH_RATIO_MAX) return 'TOO_CLOSE';

        // 2. Check Centering (X and Y axis)
        const devX = Math.abs(centerX - videoWidth / 2) / videoWidth;
        const devY = Math.abs(centerY - videoHeight / 2) / videoHeight;
        
        // Allow slightly more vertical deviation downwards (natural selfie angle)
        if (devX > CENTER_TOLERANCE || devY > (CENTER_TOLERANCE + 0.05)) return 'CENTER_FACE';

        // 3. Check Head Tilt (Roll) using Eye Keypoints
        const keypoints = detection.keypoints;
        if (keypoints && keypoints.length >= 2) {
            const rightEye = keypoints[0];
            const leftEye = keypoints[1];
            // Calculate angle in degrees
            const dy = rightEye.y - leftEye.y;
            const dx = rightEye.x - leftEye.x;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            if (Math.abs(angle) > TILT_TOLERANCE) return 'TILT_HEAD';
        }

        return 'HOLD_STILL';
    }, []);

    const performCapture = useCallback(() => {
        if (!webcamRef.current) return;
        
        setStatus('CAPTURING');
        setFlashActive(true); // Trigger white flash

        // Short delay to allow flash to render
        setTimeout(() => {
            const imageSrc = webcamRef.current?.getScreenshot();
            if (imageSrc) {
                fetch(imageSrc)
                    .then(res => res.blob())
                    .then(blob => {
                        const file = new File([blob], `smart-selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
                        onCapture(file);
                        // Small delay before closing to show the "flash" effect
                        setTimeout(onClose, 300);
                    })
                    .catch(() => setStatus('NO_FACE'));
            } else {
                setStatus('NO_FACE');
                setFlashActive(false);
            }
        }, 150);
    }, [onCapture, onClose]);

    const detectFaces = useCallback(() => {
        if (!detectorRef.current || !webcamRef.current?.video || webcamRef.current.video.readyState !== 4) {
            animationFrameRef.current = requestAnimationFrame(detectFaces);
            return;
        }

        const video = webcamRef.current.video;
        const startTimeMs = performance.now();
        
        try {
            const detections = detectorRef.current.detectForVideo(video, startTimeMs);
            
            let currentStatus: AlignmentStatus = 'NO_FACE';

            if (detections.detections.length > 0) {
                // Use the first detected face
                currentStatus = checkAlignment(
                    detections.detections[0],
                    video.videoWidth,
                    video.videoHeight
                );
            }

            // State Logic for "Holding"
            if (currentStatus === 'HOLD_STILL') {
                if (holdStartTimeRef.current === null) {
                    holdStartTimeRef.current = startTimeMs;
                    setProgress(0);
                } else {
                    const elapsed = startTimeMs - holdStartTimeRef.current;
                    const progressVal = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100);
                    setProgress(progressVal);

                    if (elapsed >= HOLD_DURATION_MS) {
                        performCapture();
                        return; // Stop loop
                    }
                }
            } else {
                // Reset if alignment is lost
                holdStartTimeRef.current = null;
                setProgress(0);
            }

            // Only update React state if status changes to avoid re-renders
            if (currentStatus !== lastStatusRef.current) {
                setStatus(currentStatus);
                lastStatusRef.current = currentStatus;
            }

        } catch (error) {
            console.error(error);
        }

        animationFrameRef.current = requestAnimationFrame(detectFaces);
    }, [checkAlignment, performCapture]);

    useEffect(() => {
        if (isOpen && isDetectorReady) {
            animationFrameRef.current = requestAnimationFrame(detectFaces);
        }
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isOpen, isDetectorReady, detectFaces]);

    if (!isOpen) return null;

    // UI Helpers
    const getStatusColor = () => {
        switch (status) {
            case 'HOLD_STILL': return '#22c55e'; // Green
            case 'CAPTURING': return '#ffffff'; // White
            case 'NO_FACE': return '#ef4444'; // Red
            default: return '#eab308'; // Yellow/Warning
        }
    };

    const getInstructionText = () => {
        switch (status) {
            case 'LOADING': return 'Starting camera...';
            case 'NO_FACE': return 'Face not found';
            case 'TOO_CLOSE': return 'Move back';
            case 'TOO_FAR': return 'Move closer';
            case 'CENTER_FACE': return 'Center your face';
            case 'TILT_HEAD': return 'Straighten your head';
            case 'HOLD_STILL': return 'Hold still...';
            case 'CAPTURING': return 'Smile!';
            default: return 'Align your face';
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
            style={{ height: '100dvh' }}
        >
            {/* Flash Overlay */}
            <div 
                className={`absolute inset-0 z-[60] bg-white pointer-events-none transition-opacity duration-300 ${flashActive ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Close Button - NOW MOBILE SAFE (Notch Friendly) */}
            <button
                onClick={onClose}
                className="absolute right-6 z-50 p-4 rounded-full bg-black/10 hover:bg-black/20 text-black transition-colors"
                style={{ 
                    // This is the magic line for iPhones:
                    top: 'calc(1.5rem + env(safe-area-inset-top))' 
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>

            {/* Main Camera Container */}
            <div className="relative w-full max-w-lg aspect-[3/4] overflow-hidden rounded-2xl shadow-2xl bg-black">
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    }}
                    mirrored={true}
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Overlays */}
                <div className="absolute inset-0 z-40 pointer-events-none">
                    {/* Dark overlay with "Hole" for face (Vignette) */}
                    <svg width="100%" height="100%" preserveAspectRatio="none">
                        <defs>
                            <mask id="face-mask">
                                <rect width="100%" height="100%" fill="white" />
                                <ellipse cx="50%" cy="50%" rx="35%" ry="45%" fill="black" />
                            </mask>
                        </defs>
                        <rect width="100%" height="100%" fill="rgba(0,0,0,0.3)" mask="url(#face-mask)" />
                    </svg>

                    {/* Active Guide Ring */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div 
                            className="relative w-[70%] h-[55%] transition-all duration-300 ease-out"
                            style={{
                                transform: status === 'HOLD_STILL' ? 'scale(1.05)' : 'scale(1)',
                            }}
                        >
                            {/* The Oval Guide */}
                            <svg className="w-full h-full overflow-visible">
                                <ellipse 
                                    cx="50%" 
                                    cy="50%" 
                                    rx="50%" 
                                    ry="50%" 
                                    fill="none" 
                                    stroke={getStatusColor()} 
                                    strokeWidth="4"
                                    strokeDasharray="10 5"
                                    className="transition-colors duration-300"
                                    opacity={0.7}
                                />
                                
                                {/* Progress Ring (Only shows when holding) */}
                                {progress > 0 && (
                                    <ellipse 
                                        cx="50%" 
                                        cy="50%" 
                                        rx="50%" 
                                        ry="50%" 
                                        fill="none" 
                                        stroke="#22c55e" 
                                        strokeWidth="6"
                                        strokeDasharray={`${(progress / 100) * 1000} 1000`} // Approx circumference
                                        strokeLinecap="round"
                                        pathLength="1000"
                                        className="transition-all duration-100 ease-linear"
                                        transform="rotate(-90 50% 50%)" // Start from top
                                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                                    />
                                )}
                            </svg>
                        </div>
                    </div>

                    {/* Status Text / Feedback */}
                    <div className="absolute bottom-12 inset-x-0 flex flex-col items-center text-center space-y-2">
                        <div 
                            className="px-6 py-2 rounded-full backdrop-blur-md transition-colors duration-300 shadow-lg"
                            style={{
                                backgroundColor: status === 'HOLD_STILL' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                            }}
                        >
                            <span 
                                className="text-lg font-bold tracking-wide"
                                style={{
                                    color: status === 'HOLD_STILL' ? '#ffffff' : '#1a1a1a'
                                }}
                            >
                                {getInstructionText()}
                            </span>
                        </div>
                        {status === 'HOLD_STILL' && (
                            <p className="text-white text-sm font-medium drop-shadow-md">
                                Keep steady...
                            </p>
                        )}
                    </div>
                </div>
            </div>
            
            <p className="mt-6 text-gray-500 font-medium text-sm">
                Ensure you are in a well-lit area
            </p>
        </div>
    );
};