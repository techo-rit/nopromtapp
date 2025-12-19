import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FaceDetector, FilesetResolver, Detection } from '@mediapipe/tasks-vision';

interface SmartSelfieModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

type CaptureStatus = 'loading' | 'align' | 'hold' | 'capturing';

export const SmartSelfieModal: React.FC<SmartSelfieModalProps> = ({
    isOpen,
    onClose,
    onCapture,
}) => {
    const webcamRef = useRef<Webcam>(null);
    const detectorRef = useRef<FaceDetector | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const alignedFramesRef = useRef<number>(0);
    const [status, setStatus] = useState<CaptureStatus>('loading');
    const [isDetectorReady, setIsDetectorReady] = useState(false);

    const ALIGNED_FRAMES_REQUIRED = 3;
    const GUIDE_BOX_TOLERANCE = 0.15;
    const NOSE_EYE_TOLERANCE = 0.05;

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
                    setStatus('align');
                }
            } catch (error) {
                console.error('Failed to initialize face detector:', error);
                if (isMounted) {
                    setStatus('align');
                    setIsDetectorReady(false);
                }
            }
        };

        initializeDetector();

        return () => {
            isMounted = false;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (detectorRef.current) {
                detectorRef.current.close();
                detectorRef.current = null;
            }
            setIsDetectorReady(false);
            setStatus('loading');
            alignedFramesRef.current = 0;
        };
    }, [isOpen]);

    const checkFaceAlignment = useCallback((detection: Detection, videoWidth: number, videoHeight: number): boolean => {
        const bbox = detection.boundingBox;
        if (!bbox) return false;

        const guideBoxLeft = videoWidth * 0.2;
        const guideBoxRight = videoWidth * 0.8;
        const guideBoxTop = videoHeight * 0.15;
        const guideBoxBottom = videoHeight * 0.75;

        const tolerance = Math.min(videoWidth, videoHeight) * GUIDE_BOX_TOLERANCE;

        const faceLeft = bbox.originX;
        const faceRight = bbox.originX + bbox.width;
        const faceTop = bbox.originY;
        const faceBottom = bbox.originY + bbox.height;

        const isInsideBox = 
            faceLeft >= guideBoxLeft - tolerance &&
            faceRight <= guideBoxRight + tolerance &&
            faceTop >= guideBoxTop - tolerance &&
            faceBottom <= guideBoxBottom + tolerance;

        if (!isInsideBox) return false;

        const keypoints = detection.keypoints;
        if (!keypoints || keypoints.length < 4) return true;

        const rightEye = keypoints[0];
        const leftEye = keypoints[1];
        const noseTip = keypoints[2];

        if (!leftEye || !rightEye || !noseTip) return true;

        const eyeMidpointX = (leftEye.x + rightEye.x) / 2;
        const eyeDistance = Math.abs(rightEye.x - leftEye.x);
        const noseDeviation = Math.abs(noseTip.x - eyeMidpointX);
        const deviationRatio = noseDeviation / eyeDistance;

        return deviationRatio < NOSE_EYE_TOLERANCE;
    }, []);

    const capturePhoto = useCallback(() => {
        if (!webcamRef.current) return;

        setStatus('capturing');
        const imageSrc = webcamRef.current.getScreenshot();
        
        if (imageSrc) {
            fetch(imageSrc)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    onCapture(file);
                    onClose();
                })
                .catch(err => {
                    console.error('Failed to convert screenshot to file:', err);
                    setStatus('align');
                });
        } else {
            setStatus('align');
        }
    }, [onCapture, onClose]);

    const detectFaces = useCallback(() => {
        if (!isDetectorReady || !detectorRef.current || !webcamRef.current) {
            animationFrameRef.current = requestAnimationFrame(detectFaces);
            return;
        }

        const video = webcamRef.current.video;
        if (!video || video.readyState !== 4) {
            animationFrameRef.current = requestAnimationFrame(detectFaces);
            return;
        }

        try {
            const detections = detectorRef.current.detectForVideo(video, performance.now());
            
            if (detections.detections.length === 1) {
                const isAligned = checkFaceAlignment(
                    detections.detections[0],
                    video.videoWidth,
                    video.videoHeight
                );

                if (isAligned) {
                    alignedFramesRef.current += 1;
                    
                    if (alignedFramesRef.current >= ALIGNED_FRAMES_REQUIRED) {
                        capturePhoto();
                        return;
                    } else {
                        setStatus('hold');
                    }
                } else {
                    alignedFramesRef.current = 0;
                    setStatus('align');
                }
            } else {
                alignedFramesRef.current = 0;
                setStatus('align');
            }
        } catch (error) {
            console.error('Detection error:', error);
        }

        animationFrameRef.current = requestAnimationFrame(detectFaces);
    }, [isDetectorReady, checkFaceAlignment, capturePhoto]);

    useEffect(() => {
        if (isOpen && isDetectorReady) {
            animationFrameRef.current = requestAnimationFrame(detectFaces);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isOpen, isDetectorReady, detectFaces]);

    if (!isOpen) return null;

    const statusText = {
        loading: 'Initializing camera...',
        align: 'Align your face',
        hold: 'Hold still...',
        capturing: 'Capturing...',
    };

    return (
        <div 
            className="fixed inset-0 z-50 bg-black"
            style={{ height: '100dvh' }}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-[#1a1a1a]/80 text-white hover:bg-[#2a2a2a] transition-colors"
                aria-label="Close camera"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" style={{ strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}/>
                </svg>
            </button>

            <div className="relative w-full h-full flex flex-col items-center justify-center">
                <div className="relative w-full h-full max-w-[600px] mx-auto">
                    <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{
                            facingMode: 'user',
                            width: { ideal: 720 },
                            height: { ideal: 960 },
                        }}
                        mirrored={true}
                        disablePictureInPicture={true}
                        forceScreenshotSourceSize={false}
                        imageSmoothing={true}
                        screenshotQuality={0.92}
                        onUserMedia={() => {}}
                        onUserMediaError={() => {}}
                        className="w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 pointer-events-none">
                        <div 
                            className="absolute border-2 rounded-3xl"
                            style={{
                                left: '20%',
                                right: '20%',
                                top: '15%',
                                bottom: '25%',
                                borderColor: status === 'hold' ? '#c9a962' : status === 'capturing' ? '#22c55e' : '#ffffff',
                                transition: 'border-color 0.2s ease',
                            }}
                        />

                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-[15%]">
                            <div 
                                className="px-6 py-3 rounded-full bg-black/60 backdrop-blur-sm"
                            >
                                <p 
                                    className="text-lg font-medium"
                                    style={{
                                        color: status === 'hold' ? '#c9a962' : status === 'capturing' ? '#22c55e' : '#ffffff',
                                    }}
                                >
                                    {statusText[status]}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
