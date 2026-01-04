// types.ts

export type NavCategory = "Try on" | "Creators"; // <--- Add this line

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
  credits: number;
  createdAt: Date;
  lastLogin: Date;
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
  credits: number;
  features: string[];
  isPopular?: boolean;
  badge?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  creditsPurchased: number;
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
  userId: string;
  userEmail: string;
  userName?: string;
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
  userId: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  subscriptionId?: string;
  creditsAdded?: number;
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