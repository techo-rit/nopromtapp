// src/lib/serverConfig.js
/**
 * Server-side configuration constants
 */

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  MAX_BASE64_LENGTH: Math.ceil((10 * 1024 * 1024) * 4 / 3),
  ALLOWED_MIME_TYPES: new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ]),
};

export const GEMINI_CONFIG = {
  MODEL_NAME: 'gemini-2.5-flash-image',
  MAX_PROMPT_LENGTH: 100000,
};

export const RATE_LIMIT_CONFIG = {
  GENERATE: { requests: 20, windowSeconds: 60 },
  ORDER: { requests: 10, windowSeconds: 60 },
};

export const PAYMENT_CONFIG = {
  RETRY_DELAY_MS: 500,
  RETRY_ATTEMPTS: 2,
  CURRENCY: 'INR',
};

export const PRICING_PLANS = {
  essentials: {
    name: 'Essentials',
    price: 12900,
    credits: 20,
    currency: 'INR',
  },
  ultimate: {
    name: 'Ultimate',
    price: 74900,
    credits: 135,
    currency: 'INR',
  },
};
