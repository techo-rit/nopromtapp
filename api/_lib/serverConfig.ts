// api/_lib/serverConfig.ts
/**
 * Server-side configuration constants
 * * These values are used by API routes and should be kept in sync
 * with client-side config.ts where applicable.
 */

// Image validation
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_BASE64_LENGTH: Math.ceil((10 * 1024 * 1024) * 4 / 3), // Base64 encoded size
  ALLOWED_MIME_TYPES: new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ]),
} as const;

// Gemini AI configuration
export const GEMINI_CONFIG = {
  // Using gemini-2.5-flash-image for image generation
  MODEL_NAME: 'gemini-2.5-flash-image',
  MAX_PROMPT_LENGTH: 100000,
} as const;

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  GENERATE: { requests: 20, windowSeconds: 60 },
  ORDER: { requests: 10, windowSeconds: 60 },
} as const;

// Payment configuration
export const PAYMENT_CONFIG = {
  RETRY_DELAY_MS: 500,
  RETRY_ATTEMPTS: 2,
  CURRENCY: 'INR',
} as const;

// Pricing plans (source of truth for server-side)
export const PRICING_PLANS: Record<string, { 
  name: string; 
  price: number; 
  credits: number; 
  currency: string;
}> = {
  essentials: {
    name: 'Essentials',
    price: 12900, // ₹129 in paise
    credits: 20,
    currency: 'INR',
  },
  ultimate: {
    name: 'Ultimate',
    price: 74900, // ₹749 in paise
    credits: 135,
    currency: 'INR',
  },
} as const;