/**
 * Payment Service
 * 
 * Client-side wrapper for payment-related API calls.
 * Handles Razorpay script loading and checkout flow.
 */

import { supabase } from '../lib/supabase';
import type { 
  CreateOrderRequest, 
  CreateOrderResponse, 
  VerifyPaymentRequest, 
  VerifyPaymentResponse,
  RazorpayCheckoutOptions,
  RazorpayPaymentResponse 
} from '../types';

// Razorpay checkout script URL
const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

// Helper to get current auth token
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Track if script is loaded
let razorpayScriptLoaded = false;
let razorpayScriptLoading: Promise<void> | null = null;

/**
 * Load Razorpay checkout script dynamically
 */
export async function loadRazorpayScript(): Promise<void> {
  // Already loaded
  if (razorpayScriptLoaded && window.Razorpay) {
    return;
  }

  // Currently loading
  if (razorpayScriptLoading) {
    return razorpayScriptLoading;
  }

  // Start loading
  razorpayScriptLoading = new Promise((resolve, reject) => {
    // Check if already in DOM
    const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existingScript) {
      razorpayScriptLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      razorpayScriptLoaded = true;
      resolve();
    };

    script.onerror = () => {
      reject(new Error('Failed to load Razorpay script'));
    };

    document.body.appendChild(script);
  });

  return razorpayScriptLoading;
}

/**
 * Create a new Razorpay order
 * SECURITY: Now requires authentication - user info comes from JWT
 */
export async function createOrder(request: { planId: string }): Promise<CreateOrderResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Please sign in to continue' };
    }

    const response = await fetch('/api/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ planId: request.planId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Failed to create order (${response.status})`,
      };
    }

    return data;
  } catch (error: any) {
    console.error('Create order error:', error);
    return {
      success: false,
      error: error.message || 'Network error. Please try again.',
    };
  }
}

/**
 * Verify payment after Razorpay checkout
 * SECURITY: Now requires authentication - userId comes from JWT
 */
export async function verifyPayment(request: Omit<VerifyPaymentRequest, 'userId'>): Promise<VerifyPaymentResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Session expired. Please sign in again.' };
    }

    const response = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Verification failed (${response.status})`,
      };
    }

    return data;
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return {
      success: false,
      error: error.message || 'Network error. Please contact support.',
    };
  }
}

/**
 * Get user subscription status
 * SECURITY: Now uses JWT auth - no userId in URL
 */
export async function getUserSubscription(): Promise<{
  success: boolean;
  profile?: {
    id: string;
    email: string;
    name: string;
    credits: number;
  };
  subscriptions?: any[];
  stats?: {
    totalCreditsPurchased: number;
    totalPayments: number;
  };
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Please sign in to view subscription' };
    }

    const response = await fetch('/api/user-subscription', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Failed to fetch subscription (${response.status})`,
      };
    }

    return data;
  } catch (error: any) {
    console.error('Get subscription error:', error);
    return {
      success: false,
      error: error.message || 'Network error.',
    };
  }
}

/**
 * Open Razorpay checkout modal
 */
export async function openRazorpayCheckout(
  options: {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    prefill: { name: string; email: string };
    planName: string;
  },
  onSuccess: (response: RazorpayPaymentResponse) => void,
  onDismiss: () => void
): Promise<void> {
  // Ensure script is loaded
  await loadRazorpayScript();

  if (!window.Razorpay) {
    throw new Error('Razorpay not available');
  }

  const checkoutOptions: RazorpayCheckoutOptions = {
    key: options.keyId,
    amount: options.amount,
    currency: options.currency,
    name: 'nopromt.ai',
    description: `${options.planName} Plan`,
    order_id: options.orderId,
    prefill: options.prefill,
    theme: {
      color: '#c9a962', // Gold accent color
    },
    handler: onSuccess,
    modal: {
      ondismiss: onDismiss,
      escape: true,
      backdropclose: false,
    },
  };

  const razorpay = new window.Razorpay(checkoutOptions);
  razorpay.open();
}

/**
 * Complete payment flow
 * Creates order → Opens checkout → Verifies payment
 * SECURITY: User info now comes from JWT, not passed to API
 */
export async function processPayment(
  planId: string,
  planName: string,
  user: { id: string; email: string; name: string },
  callbacks: {
    onOrderCreated?: () => void;
    onCheckoutOpened?: () => void;
    onPaymentSuccess?: (creditsAdded: number) => void;
    onPaymentFailed?: (error: string) => void;
    onCheckoutDismissed?: () => void;
  }
): Promise<void> {
  // Step 1: Create order (JWT auth handles user identification)
  const orderResponse = await createOrder({ planId });

  if (!orderResponse.success || !orderResponse.orderId) {
    callbacks.onPaymentFailed?.(orderResponse.error || 'Failed to create order');
    return;
  }

  callbacks.onOrderCreated?.();

  // Step 2: Open Razorpay checkout
  try {
    callbacks.onCheckoutOpened?.();

    await openRazorpayCheckout(
      {
        orderId: orderResponse.orderId,
        amount: orderResponse.amount!,
        currency: orderResponse.currency!,
        keyId: orderResponse.keyId!,
        prefill: orderResponse.prefill!,
        planName,
      },
      async (paymentResponse) => {
        // Step 3: Verify payment (JWT auth handles user identification)
        const verifyResponse = await verifyPayment({
          razorpayOrderId: paymentResponse.razorpay_order_id,
          razorpayPaymentId: paymentResponse.razorpay_payment_id,
          razorpaySignature: paymentResponse.razorpay_signature,
        });

        if (verifyResponse.success) {
          callbacks.onPaymentSuccess?.(verifyResponse.creditsAdded || 0);
        } else {
          callbacks.onPaymentFailed?.(verifyResponse.error || 'Payment verification failed');
        }
      },
      () => {
        callbacks.onCheckoutDismissed?.();
      }
    );
  } catch (error: any) {
    callbacks.onPaymentFailed?.(error.message || 'Failed to open checkout');
  }
}
