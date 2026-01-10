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
  },
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ACCEPTED_TYPES: ["image/jpeg", "image/png", "image/webp"],
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