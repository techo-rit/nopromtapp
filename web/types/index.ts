export type NavCategory = "Try on" | "Creators";

export interface Stack {
  id: string;
  name: string;
  imageUrl: string;
}

export interface Template {
  id: string;
  name: string;
  stackId: string;
  imageUrl: string;
  prompt: string | Record<string, any>;
  aspectRatio: string;
  keywords?: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  ageRange: string | null;
  colors: string[];
  styles: string[];
  fit: string | null;
  bodyType: string | null;
  skinTone: string | null;
  avatarUrl: string | null;
  isOnboardingComplete: boolean;
  accountType: 'free' | 'essentials' | 'ultimate';
  monthlyQuota: number;
  monthlyUsed: number;
  extraCredits: number;
  creationsLeft: number;
  createdAt: Date;
  lastLogin: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  ageRange: string | null;
  colors: string[];
  styles: string[];
  fit: string | null;
  bodyType: string | null;
  skinTone: string | null;
  avatarUrl: string | null;
  isOnboardingComplete: boolean;
  accountType: 'free' | 'essentials' | 'ultimate';
  monthlyQuota: number;
  monthlyUsed: number;
  extraCredits: number;
  creationsLeft: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserAddress {
  id: string;
  userId: string;
  label: string;
  addressLine: string;
  city: string | null;
  state: string | null;
  pincode: string | null;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
  createdAt: string;
}

// ==========================================
// GENERATED IMAGES GALLERY
// ==========================================

export interface GeneratedImage {
  id: string;
  imageUrl: string;
  templateId: string | null;
  templateName: string | null;
  stackId: string | null;
  mode: 'remix' | 'tryon';
  aspectRatio: string | null;
  createdAt: string;
}

// ==========================================
// PAYMENT & SUBSCRIPTION TYPES
// ==========================================

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number; // Price in smallest currency unit (paise for INR)
  displayPrice: string; // Formatted price for display (e.g., "₹129")
  currency: string;
  creations: number;
  accountType: 'essentials' | 'ultimate';
  features: string[];
  isPopular?: boolean;
  badge?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  creationsPurchased: number;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
}

export interface CreateOrderRequest {
  planId: string;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  prefill?: {
    name: string;
    email: string;
  };
  error?: string;
}

export interface VerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  subscriptionId?: string;
  creationsAdded?: number;
  error?: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayPaymentResponse) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

export interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// Razorpay global type (loaded via script)
declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      close: () => void;
    };
  }
}
