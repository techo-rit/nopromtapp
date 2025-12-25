import React, { useState, useCallback, useEffect, useRef } from "react";
import type { Template, Stack, User } from "../types";
import { UploadZone } from "./UploadZone";
import { Spinner } from "./Spinner";
import {
    ArrowLeftIcon,
    DownloadIcon,
    RefreshIcon,
} from "./Icons";
import { generateImage } from "../services/geminiService";

interface TemplateExecutionProps {
    template: Template;
    stack: Stack;
    onBack: () => void;
    onLoginRequired?: () => void;
    user?: User | null;
}

export const TemplateExecution: React.FC<TemplateExecutionProps> = ({
    template,
    stack,
    onBack,
    onLoginRequired,
    user,
}) => {
    const [selfieImage, setSelfieImage] = useState<File | null>(null);
    const [wearableImage, setWearableImage] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<string[] | null>(
        null,
    );
    const [partialResults, setPartialResults] = useState(false);
    const [hoveredZone, setHoveredZone] = useState<
        "selfie" | "wearable" | null
    >(null);

    const isFititStack = stack.id === "fitit";

    // Refs to access latest state inside stable event listener
    const selfieImageRef = useRef(selfieImage);
    const wearableImageRef = useRef(wearableImage);
    const hoveredZoneRef = useRef(hoveredZone);
    const isFititStackRef = useRef(isFititStack);
    const isLoadingRef = useRef(isLoading);
    const generatedImagesRef = useRef(generatedImages);

    // Sync refs with state
    useEffect(() => {
        selfieImageRef.current = selfieImage;
    }, [selfieImage]);
    useEffect(() => {
        wearableImageRef.current = wearableImage;
    }, [wearableImage]);
    useEffect(() => {
        hoveredZoneRef.current = hoveredZone;
    }, [hoveredZone]);
    useEffect(() => {
        isFititStackRef.current = isFititStack;
    }, [isFititStack]);
    useEffect(() => {
        isLoadingRef.current = isLoading;
    }, [isLoading]);
    useEffect(() => {
        generatedImagesRef.current = generatedImages;
    }, [generatedImages]);

    // Paste handler
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            // Check if user is authenticated
            if (!user) {
                onLoginRequired?.();
                return;
            }

            // Read latest state from refs
            if (isLoadingRef.current || generatedImagesRef.current) return;

            let file: File | null = null;

            // Priority 1: Check direct file list (common for file copying)
            if (e.clipboardData && e.clipboardData.files.length > 0) {
                for (let i = 0; i < e.clipboardData.files.length; i++) {
                    const f = e.clipboardData.files[i];
                    if (f.type.startsWith("image/")) {
                        file = f;
                        break;
                    }
                }
            }

            // Priority 2: Check items (common for screenshots or direct image data copy)
            if (!file && e.clipboardData && e.clipboardData.items) {
                const items = e.clipboardData.items;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf("image") !== -1) {
                        const f = items[i].getAsFile();
                        if (f) {
                            file = f;
                            break;
                        }
                    }
                }
            }

            if (file) {
                // Validate file
                if (file.size > 10 * 1024 * 1024) {
                    alert("Pasted file size exceeds 10MB.");
                    return;
                }
                if (
                    !["image/jpeg", "image/png", "image/webp"].includes(
                        file.type,
                    )
                ) {
                    alert(
                        "Invalid file type. Please paste a JPG, PNG, or WebP image.",
                    );
                    return;
                }

                const currentHoveredZone = hoveredZoneRef.current;
                const currentIsFititStack = isFititStackRef.current;
                const currentSelfie = selfieImageRef.current;
                const currentWearable = wearableImageRef.current;

                // Determine target zone
                if (currentHoveredZone === "wearable" && currentIsFititStack) {
                    setWearableImage(file);
                } else if (currentHoveredZone === "selfie") {
                    setSelfieImage(file);
                } else {
                    // Intelligent fallback if not hovering over a specific zone
                    if (!currentSelfie) {
                        setSelfieImage(file);
                    } else if (currentIsFititStack && !currentWearable) {
                        setWearableImage(file);
                    } else {
                        // Default to overwriting selfie if both full or logic fails
                        setSelfieImage(file);
                    }
                }
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => {
            window.removeEventListener("paste", handlePaste);
        };
    }, [user, onLoginRequired]); // Add user and onLoginRequired to dependency array

    const handleRemix = useCallback(async () => {
        // Check if user is authenticated
        if (!user) {
            onLoginRequired?.();
            return;
        }

        const hasAllImages = isFititStack
            ? selfieImage && wearableImage
            : selfieImage;
        if (!hasAllImages) {
            setError("Please upload all required images.");
            return;
        }

        setError(null);
        setIsLoading(true);
        setGeneratedImages(null);
        setPartialResults(false);

        try {
            const result = await generateImage(
                template,
                selfieImage!,
                wearableImage,
            );
            setGeneratedImages(result);
            if (isFititStack && result.length < 4) {
                setPartialResults(true);
            }
        } catch (e: any) {
            setError(e.message || "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [
        selfieImage,
        wearableImage,
        template,
        isFititStack,
        user,
        onLoginRequired,
    ]);

    const handleRemixAgain = () => {
        setSelfieImage(null);
        setWearableImage(null);
        setGeneratedImages(null);
        setError(null);
        setPartialResults(false);
    };

    const handleDownload = (
        imageUrl: string,
        format: "png" | "jpeg",
        index: number,
    ) => {
        if (!imageUrl) return;
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = `remix-${template.id}-${index}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const remixButtonDisabled =
        isLoading ||
        (isFititStack ? !selfieImage || !wearableImage : !selfieImage);

    return (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-12">
            

            {!generatedImages && !isLoading && (
                <>
                    <div
                        className={`flex flex-col md:flex-row justify-center items-start gap-8 mb-10`}
                    >
                        <div className="w-full max-w-md mx-auto">
                            {/* 1. SELFIE UPLOAD ZONE */}
                            <UploadZone
                                onFileChange={(file) => {
                                    if (!user) {
                                        onLoginRequired?.();
                                        return;
                                    }
                                    setSelfieImage(file);
                                }}
                                title={
                                    isFititStack
                                        ? "1. Upload Your Selfie"
                                        : "Upload Your Image"
                                }
                                subtitle="Required"
                                file={selfieImage}
                                onMouseEnter={() => setHoveredZone("selfie")}
                                onMouseLeave={() => setHoveredZone(null)}
                                // ADD THIS LINE: Explicitly use front camera for faces
                                captureMode="user" 
                            />
                        </div>
                        {isFititStack && (
                            <div className="w-full max-w-md mx-auto">
                                {/* 2. WEARABLE UPLOAD ZONE */}
                                <UploadZone
                                    onFileChange={(file) => {
                                        if (!user) {
                                            onLoginRequired?.();
                                            return;
                                        }
                                        setWearableImage(file);
                                    }}
                                    title="2. Upload Wearable"
                                    subtitle="Required"
                                    file={wearableImage}
                                    onMouseEnter={() =>
                                        setHoveredZone("wearable")
                                    }
                                    onMouseLeave={() => setHoveredZone(null)}
                                    // ADD THIS LINE: Use back camera for clothes (Standard Industry Practice)
                                    captureMode="environment"
                                />
                            </div>
                        )}
                    </div>
                    <div className="text-center">
                        <button
                            onClick={handleRemix}
                            disabled={remixButtonDisabled}
                            className="group relative min-h-[56px] inline-flex items-center justify-center gap-3 px-12 py-5 
                            bg-[#0a0a0a] text-[#E4C085] font-medium text-xl tracking-wide rounded-2xl 
                            border border-[#E4C085]/30 
                            shadow-[0_0_15px_rgba(228,192,133,0.05)]
                            hover:bg-[#141414] hover:border-[#E4C085]/60 hover:shadow-[0_0_30px_rgba(228,192,133,0.15)] hover:-translate-y-0.5
                            active:translate-y-0 active:shadow-none
                            transition-all duration-500 ease-out 
                            disabled:bg-[#0a0a0a] disabled:text-[#6b6b6b] disabled:border-[#2a2a2a] disabled:shadow-none disabled:cursor-not-allowed disabled:translate-y-0
                            focus:outline-none focus-visible:ring-1 focus-visible:ring-[#E4C085]/50"
                        >
                            {/* Inner Ambient Gradient for depth */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-[#E4C085]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            
                            <span className="relative">Transform your soul</span>
                        </button>
                    </div>
                </>
            )}

            {isLoading && (
                <div className="flex flex-col items-center justify-center text-center p-16 bg-[#141414] rounded-2xl border border-[#2a2a2a]">
                    <Spinner />
                    <h2 className="text-[28px] md:text-[40px] font-semibold tracking-[0.005em] md:tracking-[-0.01em] leading-[1.2] md:leading-[1.1] text-[#f5f5f5] mt-6">
                        Generating your images...
                    </h2>
                    <p className="text-[#a0a0a0] mt-2 text-lg">
                        This usually takes about 20-30 seconds. Please wait.
                    </p>
                </div>
            )}

            {error && !isLoading && (
                <div className="text-center p-8 bg-red-900/20 border border-red-800/50 rounded-2xl">
                    <p className="text-red-400 font-semibold text-lg">Error</p>
                    <p className="text-red-400/80 mt-2 text-lg">{error}</p>
                    <button
                        onClick={handleRemix}
                        className="min-h-[48px] mt-6 px-8 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 text-lg"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {generatedImages && !isLoading && (
                <div className="text-center">
                    {partialResults && (
                        <div className="max-w-5xl mx-auto mb-6 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-yellow-400 text-left">
                            <p>
                                <strong className="font-semibold">Note:</strong>{" "}
                                Some results may have been blocked due to our
                                safety policy. For more complete results, please
                                try using different photos that are suitable for
                                all audiences.
                            </p>
                        </div>
                    )}
                    <div
                        className={`grid grid-cols-1 ${generatedImages.length > 1 ? "md:grid-cols-2" : ""} gap-6 max-w-5xl mx-auto mb-8`}
                    >
                        {generatedImages.map((imageSrc, index) => (
                            <div
                                key={index}
                                className="relative group border border-[#2a2a2a] rounded-2xl shadow-lg overflow-hidden bg-[#141414]"
                            >
                                <img
                                    src={imageSrc}
                                    alt={`Generated result ${index + 1}`}
                                    className="w-full h-auto aspect-[3/4] object-cover"
                                />
                                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                    <button
                                        onClick={() =>
                                            handleDownload(
                                                imageSrc,
                                                "png",
                                                index,
                                            )
                                        }
                                        aria-label={`Download image ${index + 1} as PNG`}
                                        className="min-h-[44px] min-w-[44px] p-2 bg-[#141414]/90 backdrop-blur-sm rounded-full text-[#f5f5f5] hover:bg-[#1a1a1a] hover:text-[#c9a962] transition-colors shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a962]/50"
                                    >
                                        <DownloadIcon />
                                    </button>
                                    <button
                                        onClick={() =>
                                            handleDownload(
                                                imageSrc,
                                                "jpeg",
                                                index,
                                            )
                                        }
                                        aria-label={`Download image ${index + 1} as JPG`}
                                        className="min-h-[44px] min-w-[44px] p-2 bg-[#141414]/90 backdrop-blur-sm rounded-full text-[#f5f5f5] hover:bg-[#1a1a1a] hover:text-[#c9a962] transition-colors shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a962]/50"
                                    >
                                        JPG
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <button
                            onClick={handleRemixAgain}
                            className="min-h-[56px] inline-flex items-center gap-2 px-8 py-4 bg-[#1a1a1a] text-[#f5f5f5] font-semibold rounded-xl hover:bg-[#2a2a2a] transition-colors border border-[#2a2a2a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a962]/50 text-lg"
                        >
                            <RefreshIcon />
                            Start Over
                        </button>
                        <button
                            onClick={onBack}
                            className="min-h-[56px] inline-flex items-center gap-2 px-8 py-4 bg-[#0a0a0a] text-[#a0a0a0] font-semibold rounded-xl hover:bg-[#1a1a1a] hover:text-[#f5f5f5] transition-colors border border-[#2a2a2a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a962]/50 text-lg"
                        >
                            Try Another Template
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
