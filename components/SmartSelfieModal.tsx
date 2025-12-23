import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FaceDetector, FilesetResolver, Detection } from '@mediapipe/tasks-vision';

interface SmartSelfieModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

// Granular statuses for precise, professional user feedback
type AlignmentStatus =
    | 'LOADING'
    | 'NO_FACE'
    | 'TOO_CLOSE'
    | 'TOO_FAR'
    | 'OFF_CENTER'
    | 'TILTED'       // Head is crooked (Roll)
    | 'TURN_LEFT'    // Head turned right (Yaw)
    | 'TURN_RIGHT'   // Head turned left (Yaw)
    | 'HOLD_STILL'   // Perfect alignment
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
    const isCapturingRef = useRef(false); // NEW: Prevents race conditions between Auto & Manual

    // --- PROFESSIONAL INDUSTRY CONFIGURATION ---
    const HOLD_DURATION_MS = 1200;
    const FACE_WIDTH_MIN = 0.15;
    const FACE_WIDTH_MAX = 0.65;
    const CENTER_TOLERANCE = 0.15;
    const TILT_TOLERANCE_DEG = 8;
    const YAW_TOLERANCE = 0.15;
    const ASPECT_RATIO_CONTAINER = 3 / 4;

    // --- RESET STATE ON OPEN ---
    useEffect(() => {
        if (isOpen) {
            setFlashActive(false);
            setStatus('LOADING');
            setProgress(0);
            holdStartTimeRef.current = null;
            lastStatusRef.current = 'LOADING';
            isCapturingRef.current = false; // Reset capture lock
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const initializeDetector = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
                );
                if (!isMounted) return;

                const detector = await FaceDetector.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
                        delegate: 'GPU',
                    },
                    runningMode: 'VIDEO',
                    minDetectionConfidence: 0.5,
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
            setFlashActive(false);
        };
    }, [isOpen]);

    const checkAlignment = useCallback((detection: Detection, videoWidth: number, videoHeight: number): AlignmentStatus => {
        const bbox = detection.boundingBox;
        if (!bbox || videoWidth === 0 || videoHeight === 0) return 'NO_FACE';

        let visibleWidth = videoWidth;
        let visibleHeight = videoHeight;
        const videoAspect = videoWidth / videoHeight;

        if (videoAspect > ASPECT_RATIO_CONTAINER) {
            visibleWidth = videoHeight * ASPECT_RATIO_CONTAINER;
        } else {
            visibleHeight = videoWidth / ASPECT_RATIO_CONTAINER;
        }

        const faceWidth = bbox.width;
        const faceCenterX = bbox.originX + (bbox.width / 2);
        const faceCenterY = bbox.originY + (bbox.height / 2);

        // Distance Check
        const widthRatio = faceWidth / visibleWidth;
        if (widthRatio < FACE_WIDTH_MIN) return 'TOO_FAR';
        if (widthRatio > FACE_WIDTH_MAX) return 'TOO_CLOSE';

        // Centering Check
        const devX = Math.abs(faceCenterX - videoWidth / 2) / visibleWidth;
        const devY = Math.abs(faceCenterY - videoHeight / 2) / visibleHeight;

        if (devX > CENTER_TOLERANCE || devY > CENTER_TOLERANCE) return 'OFF_CENTER';

        // Geometry Checks
        const keypoints = detection.keypoints;
        if (keypoints && keypoints.length >= 6) {
            const rightEye = keypoints[0];
            const leftEye = keypoints[1];
            const nose = keypoints[2];

            // Roll Check
            const dy = (rightEye.y - leftEye.y) * videoHeight;
            const dx = (rightEye.x - leftEye.x) * videoWidth;
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);

            if (angle > 90) angle = 180 - angle;
            if (angle < -90) angle = -180 - angle;

            if (Math.abs(angle) > TILT_TOLERANCE_DEG) {
                return 'TILTED';
            }

            // Yaw Check
            const distToRightEye = Math.abs(nose.x - rightEye.x);
            const distToLeftEye = Math.abs(nose.x - leftEye.x);

            if (distToRightEye > 0 && distToLeftEye > 0) {
                const diff = distToRightEye - distToLeftEye;
                const avg = (distToRightEye + distToLeftEye) / 2;
                const yawRatio = diff / avg;

                if (yawRatio > YAW_TOLERANCE) return 'TURN_RIGHT';
                if (yawRatio < -YAW_TOLERANCE) return 'TURN_LEFT';
            }
        }

        return 'HOLD_STILL';
    }, []);

    const performCapture = useCallback(() => {
        if (!webcamRef.current || isCapturingRef.current) return;

        isCapturingRef.current = true; // Lock capture
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
                        setTimeout(onClose, 500);
                    })
                    .catch(() => {
                        setStatus('NO_FACE');
                        setFlashActive(false);
                        isCapturingRef.current = false; // Unlock on fail
                    });
            } else {
                setStatus('NO_FACE');
                setFlashActive(false);
                isCapturingRef.current = false; // Unlock on fail
            }
        }, 150);
    }, [onCapture, onClose]);

    const detectFaces = useCallback(() => {
        if (!detectorRef.current || isCapturingRef.current) {
            // If capturing, keep loop alive but don't process to prevent state conflict
            if (isCapturingRef.current) {
                animationFrameRef.current = requestAnimationFrame(detectFaces);
            }
            return;
        }

        if (!webcamRef.current?.video || webcamRef.current.video.readyState !== 4) {
            animationFrameRef.current = requestAnimationFrame(detectFaces);
            return;
        }

        const video = webcamRef.current.video;
        const startTimeMs = performance.now();

        try {
            const detections = detectorRef.current.detectForVideo(video, startTimeMs);

            let currentStatus: AlignmentStatus = 'NO_FACE';

            if (detections.detections.length > 0) {
                const primaryFace = detections.detections.sort((a, b) => {
                    return (b.boundingBox?.width || 0) - (a.boundingBox?.width || 0);
                })[0];

                currentStatus = checkAlignment(
                    primaryFace,
                    video.videoWidth,
                    video.videoHeight
                );
            }

            // Strict Hold Logic
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
                        return;
                    }
                }
            } else {
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

    const getStatusColor = () => {
        switch (status) {
            case 'HOLD_STILL': return '#22c55e'; // Green
            case 'CAPTURING': return '#ffffff'; // White
            case 'NO_FACE': return '#ef4444'; // Red
            default: return '#fbbf24'; // Amber/Yellow
        }
    };

    const getInstructionText = () => {
        switch (status) {
            case 'LOADING': return 'Starting camera...';
            case 'NO_FACE': return 'Face not found';
            case 'TOO_CLOSE': return 'Move back';
            case 'TOO_FAR': return 'Move closer';
            case 'OFF_CENTER': return 'Center your face';
            case 'TILTED': return 'Straighten head';
            case 'TURN_LEFT': return 'Turn head left';
            case 'TURN_RIGHT': return 'Turn head right';
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
            {/* Flash Layer */}
            <div
                className={`absolute inset-0 z-[60] bg-white pointer-events-none transition-opacity duration-300 ${flashActive ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute right-6 z-50 p-4 rounded-full bg-gray-100 hover:bg-gray-200 text-black transition-colors shadow-sm"
                style={{ top: 'calc(1.5rem + env(safe-area-inset-top))' }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
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

                {/* Softbox / Ring Light Overlay */}
                <div className="absolute inset-0 z-40">
                    <svg width="100%" height="100%" preserveAspectRatio="none" className="pointer-events-none">
                        <defs>
                            <mask id="face-mask">
                                <rect width="100%" height="100%" fill="white" />
                                <ellipse cx="50%" cy="50%" rx="42%" ry="54%" fill="black" />
                            </mask>
                        </defs>
                        <rect width="100%" height="100%" fill="rgba(255,255,255,0.85)" mask="url(#face-mask)" />
                    </svg>

                    {/* Guide Ring */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                            className="relative w-[84%] h-[68%] transition-all duration-300 ease-out"
                            style={{
                                transform: status === 'HOLD_STILL' ? 'scale(1.05)' : 'scale(1)',
                            }}
                        >
                            <svg className="w-full h-full overflow-visible">
                                <ellipse
                                    cx="50%"
                                    cy="50%"
                                    rx="50%"
                                    ry="50%"
                                    fill="none"
                                    stroke={getStatusColor()}
                                    strokeWidth={status === 'HOLD_STILL' ? "4" : "3"}
                                    strokeDasharray={status === 'HOLD_STILL' ? "0" : "8 6"}
                                    className="transition-colors duration-300 drop-shadow-md"
                                />
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
                                        className="transition-all duration-100 ease-linear drop-shadow-md"
                                        transform="rotate(-90 50% 50%)"
                                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                                    />
                                )}
                            </svg>
                        </div>
                    </div>

                    {/* Status Text - Moved Higher to accomodate button */}
                    <div className="absolute bottom-32 inset-x-0 flex flex-col items-center text-center space-y-2 pointer-events-none">
                        <div
                            className="px-8 py-3 rounded-full backdrop-blur-md transition-all duration-300 shadow-xl"
                            style={{
                                backgroundColor: status === 'HOLD_STILL' ? 'rgba(34, 197, 94, 1)' : 'rgba(255, 255, 255, 0.95)',
                                transform: status === 'HOLD_STILL' ? 'scale(1.05)' : 'scale(1)',
                                border: '1px solid rgba(0,0,0,0.05)'
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

                    {/* Manual Capture Shutter Button */}
                    {/* Manual Capture Shutter Button - Mobile Safe */}
                    <div
                        className="absolute inset-x-0 flex justify-center z-50"
                        style={{
                            bottom: 'calc(2rem + env(safe-area-inset-bottom))' // 2rem is approx bottom-8
                        }}
                    >
                        <button
                            onClick={performCapture}
                            disabled={status === 'LOADING'}
                            aria-label="Take Photo"
                            className="relative group transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="w-20 h-20 rounded-full border-[5px] border-white flex items-center justify-center shadow-lg bg-black/10 backdrop-blur-sm group-hover:bg-black/20 transition-colors">
                                <div className="w-16 h-16 bg-white rounded-full transition-transform group-hover:scale-90" />
                            </div>
                        </button>
                    </div>

                </div>
            </div>

            <p className="mt-6 text-gray-400 font-medium text-sm text-center px-6">
                Auto-capture is active • Press button to capture manually
            </p>
        </div>
    );
};