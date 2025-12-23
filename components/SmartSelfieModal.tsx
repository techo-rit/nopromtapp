import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FaceDetector, FilesetResolver, Detection } from '@mediapipe/tasks-vision';

interface SmartSelfieModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

// Granular statuses for precise user feedback
type AlignmentStatus = 
    | 'LOADING' 
    | 'NO_FACE' 
    | 'TOO_CLOSE' 
    | 'TOO_FAR' 
    | 'OFF_CENTER_X' // Too far left/right
    | 'OFF_CENTER_Y' // Too far up/down
    | 'TILTED'       // Head is crooked
    | 'HOLD_STILL'   // Perfect!
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
    const [progress, setProgress] = useState(0); 
    const [flashActive, setFlashActive] = useState(false);
    const [isDetectorReady, setIsDetectorReady] = useState(false);

    // Refs
    const holdStartTimeRef = useRef<number | null>(null);
    const lastStatusRef = useRef<AlignmentStatus>('LOADING');

    // --- INDUSTRY STANDARD CONFIGURATION ---
    const HOLD_DURATION_MS = 800;        // 0.8s (Very snappy)
    const FACE_WIDTH_MIN = 0.05;         // 5% (Detects even if very far)
    const FACE_WIDTH_MAX = 0.95;         // 95% (Detects even if face fills screen)
    const CENTER_TOLERANCE_X = 0.35;     // 35% deviation (Very forgiving horizontal)
    const CENTER_TOLERANCE_Y = 0.40;     // 40% deviation (Very forgiving vertical)
    const TILT_TOLERANCE_DEG = 45;       // 45 degrees (Allows casual head tilt)

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
                    minDetectionConfidence: 0.3, // High sensitivity
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

    const checkAlignment = useCallback((detection: Detection, videoWidth: number, videoHeight: number): AlignmentStatus => {
        const bbox = detection.boundingBox;
        if (!bbox || videoWidth === 0 || videoHeight === 0) return 'NO_FACE';

        const { originX, originY, width, height } = bbox;
        const centerX = originX + width / 2;
        const centerY = originY + height / 2;

        // 1. Distance Check
        const widthRatio = width / videoWidth;
        if (widthRatio < FACE_WIDTH_MIN) return 'TOO_FAR';
        if (widthRatio > FACE_WIDTH_MAX) return 'TOO_CLOSE';

        // 2. Centering Check
        const devX = Math.abs(centerX - videoWidth / 2) / videoWidth;
        const devY = Math.abs(centerY - videoHeight / 2) / videoHeight;
        
        if (devX > CENTER_TOLERANCE_X) return 'OFF_CENTER_X';
        // Allow face to be a bit higher or lower, but not off screen
        if (devY > CENTER_TOLERANCE_Y) return 'OFF_CENTER_Y';

        // 3. Tilt Check (Corrected Math)
        const keypoints = detection.keypoints;
        if (keypoints && keypoints.length >= 2) {
            const rightEye = keypoints[0];
            const leftEye = keypoints[1];
            
            if (rightEye && leftEye) {
                // IMPORTANT: Scale normalized keypoints to pixels for correct angle
                // MediaPipe keypoints are 0.0-1.0
                const dy = (rightEye.y - leftEye.y) * videoHeight;
                const dx = (rightEye.x - leftEye.x) * videoWidth;
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                
                // If angle is excessive (e.g. > 45 degrees)
                if (Math.abs(angle) > TILT_TOLERANCE_DEG) {
                    return 'TILTED';
                }
            }
        }

        return 'HOLD_STILL';
    }, []);

    const performCapture = useCallback(() => {
        if (!webcamRef.current) return;
        
        setStatus('CAPTURING');
        setFlashActive(true);

        setTimeout(() => {
            const imageSrc = webcamRef.current?.getScreenshot();
            if (imageSrc) {
                fetch(imageSrc)
                    .then(res => res.blob())
                    .then(blob => {
                        const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
                        onCapture(file);
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
                // Filter for the biggest face (closest to camera)
                const primaryFace = detections.detections.sort((a, b) => {
                    return (b.boundingBox?.width || 0) - (a.boundingBox?.width || 0);
                })[0];

                currentStatus = checkAlignment(
                    primaryFace,
                    video.videoWidth,
                    video.videoHeight
                );
            }

            // Logic for "Holding"
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
                // If we lose status briefly, maybe don't reset instantly? 
                // For now, reset to keep it responsive.
                holdStartTimeRef.current = null;
                setProgress(0);
            }

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
            default: return '#eab308'; // Yellow for all warnings
        }
    };

    const getInstructionText = () => {
        switch (status) {
            case 'LOADING': return 'Camera starting...';
            case 'NO_FACE': return 'Face not found';
            case 'TOO_CLOSE': return 'Move back';
            case 'TOO_FAR': return 'Move closer';
            case 'OFF_CENTER_X': return 'Center your face';
            case 'OFF_CENTER_Y': return 'Center your face';
            case 'TILTED': return 'Straighten head';
            case 'HOLD_STILL': return 'Hold still...';
            case 'CAPTURING': return 'Perfect!';
            default: return 'Align face';
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
            style={{ height: '100dvh' }}
        >
            {/* Flash */}
            <div 
                className={`absolute inset-0 z-[60] bg-white pointer-events-none transition-opacity duration-300 ${flashActive ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Mobile-Safe Close Button */}
            <button
                onClick={onClose}
                className="absolute right-6 z-50 p-4 rounded-full bg-black/10 hover:bg-black/20 text-black transition-colors"
                style={{ top: 'calc(1.5rem + env(safe-area-inset-top))' }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>

            {/* Camera Viewport */}
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
                    {/* Vignette */}
                    <svg width="100%" height="100%" preserveAspectRatio="none">
                        <defs>
                            <mask id="face-mask">
                                <rect width="100%" height="100%" fill="white" />
                                <ellipse cx="50%" cy="50%" rx="40%" ry="50%" fill="black" />
                            </mask>
                        </defs>
                        <rect width="100%" height="100%" fill="rgba(0,0,0,0.3)" mask="url(#face-mask)" />
                    </svg>

                    {/* Dynamic Guide Ring */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div 
                            className="relative w-[80%] h-[60%] transition-all duration-300 ease-out"
                            style={{
                                transform: status === 'HOLD_STILL' ? 'scale(1.05)' : 'scale(1)',
                            }}
                        >
                            <svg className="w-full h-full overflow-visible">
                                {/* Base Guide */}
                                <ellipse 
                                    cx="50%" 
                                    cy="50%" 
                                    rx="50%" 
                                    ry="50%" 
                                    fill="none" 
                                    stroke={getStatusColor()} 
                                    strokeWidth={status === 'HOLD_STILL' ? "4" : "2"}
                                    strokeDasharray={status === 'HOLD_STILL' ? "0" : "8 6"}
                                    className="transition-colors duration-300"
                                    opacity={0.8}
                                />
                                
                                {/* Progress Arc */}
                                {progress > 0 && (
                                    <ellipse 
                                        cx="50%" 
                                        cy="50%" 
                                        rx="50%" 
                                        ry="50%" 
                                        fill="none" 
                                        stroke="#22c55e" 
                                        strokeWidth="6"
                                        strokeDasharray={`${(progress / 100) * 1000} 1000`} 
                                        strokeLinecap="round"
                                        pathLength="1000"
                                        className="transition-all duration-100 ease-linear"
                                        transform="rotate(-90 50% 50%)" 
                                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                                    />
                                )}
                            </svg>
                        </div>
                    </div>

                    {/* Status Pill */}
                    <div className="absolute bottom-12 inset-x-0 flex flex-col items-center text-center space-y-2">
                        <div 
                            className="px-6 py-2 rounded-full backdrop-blur-md transition-all duration-300 shadow-lg"
                            style={{
                                backgroundColor: status === 'HOLD_STILL' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                                transform: status === 'HOLD_STILL' ? 'scale(1.1)' : 'scale(1)',
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
                    </div>
                </div>
            </div>
            
            <p className="mt-6 text-gray-500 font-medium text-sm">
                Ensure you are in a well-lit area
            </p>
        </div>
    );
};