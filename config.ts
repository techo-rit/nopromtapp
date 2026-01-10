// src/config.ts

// 1. Environment Variables Validation
const getEnv = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    console.warn(`Missing environment variable: ${key}`);
    return "";
  }
  return value;
};

export const CONFIG = {
  SUPABASE: {
    URL: getEnv("VITE_SUPABASE_URL"),
    ANON_KEY: getEnv("VITE_SUPABASE_ANON_KEY"),
  },
  PAYMENTS: {
    RAZORPAY_SCRIPT: "https://checkout.razorpay.com/v1/checkout.js",
    CURRENCY: "INR",
    RETRY_DELAY_MS: 500,
    RETRY_ATTEMPTS: 2,
  },
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_BASE64_LENGTH: Math.ceil((10 * 1024 * 1024) * 4 / 3), // Base64 encoded size
    ACCEPTED_TYPES: ["image/jpeg", "image/png", "image/webp"],
    ALLOWED_MIME_TYPES: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
  },
  RATE_LIMITS: {
    GENERATE: { requests: 20, windowSeconds: 60 },
    ORDER: { requests: 10, windowSeconds: 60 },
  },
  GEMINI: {
    MODEL_NAME: "gemini-2.5-flash-image",
    MAX_PROMPT_LENGTH: 10000,
  },
  MEDIAPIPE: {
    CDN_URL: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
    MODEL_URL: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
    MIN_DETECTION_CONFIDENCE: 0.5,
  },
  FACE_DETECTION: {
    HOLD_DURATION_MS: 900,
    FACE_WIDTH_MIN: 0.15,
    FACE_WIDTH_MAX: 0.65,
    CENTER_TOLERANCE: 0.25,
    TILT_TOLERANCE_DEG: 15,
    YAW_TOLERANCE: 0.25,
    PITCH_TOLERANCE: 0.08,
    ASPECT_RATIO_CONTAINER: 3 / 4,
    CAPTURE_DELAY_MS: 150,
  },
  UI: {
    SEARCH_DEBOUNCE_MS: 250,
    ANIMATION_DURATION_MS: 300,
  },
  APP: {
    NAME: "NoPromt",
    // Used in App.tsx for logic
    CREATOR_STACKS: [
      "flex", "aesthetics", "sceneries", "clothes", 
      "monuments", "celebration", "fitit", "animation"
    ],
  }
};