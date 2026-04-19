/**
 * PaymentModal Component
 * 
 * Complete modal-based payment flow:
 * 1. Plan Selection
 * 2. Payment Processing (Razorpay Checkout)
 * 3. Success State
 * 4. Error/Retry State
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CloseIcon } from '../../shared/ui/Icons';
import { PRICING_PLANS } from '../../data/constants';
import type { User, PricingPlan } from '../../types';
import { processPayment, loadRazorpayScript } from './paymentService';

// Payment flow states
type PaymentState = 'plan-selection' | 'processing' | 'success' | 'error';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onPaymentSuccess: (creationsAdded: number) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  user,
  onPaymentSuccess,
}) => {
  const [paymentState, setPaymentState] = useState<PaymentState>('plan-selection');
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [creationsAdded, setCreationsAdded] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Preload Razorpay script when modal opens
  useEffect(() => {
    if (isOpen) {
      loadRazorpayScript().catch(console.error);
    }
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentState('plan-selection');
      setSelectedPlan(null);
      setCreationsAdded(0);
      setErrorMessage('');
      setIsLoading(false);
    }
  }, [isOpen]);

  // Handle plan selection and payment
  const handleSelectPlan = useCallback(async (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setIsLoading(true);
    setPaymentState('processing');

    await processPayment(
      plan.id,
      plan.name,
      { id: user.id, email: user.email, name: user.name },
      {
        onOrderCreated: () => {
          // Order created, checkout will open
        },
        onCheckoutOpened: () => {
          // Razorpay modal is now open
          setIsLoading(false);
        },
        onPaymentSuccess: (creations) => {
          setCreationsAdded(creations);
          setPaymentState('success');
          onPaymentSuccess(creations);
        },
        onPaymentFailed: (error) => {
          setErrorMessage(error);
          setPaymentState('error');
          setIsLoading(false);
        },
        onCheckoutDismissed: () => {
          // User closed Razorpay modal without completing
          setPaymentState('plan-selection');
          setIsLoading(false);
        },
      }
    );
  }, [user, onPaymentSuccess]);

  // Handle retry
  const handleRetry = useCallback(() => {
    if (selectedPlan) {
      handleSelectPlan(selectedPlan);
    } else {
      setPaymentState('plan-selection');
    }
  }, [selectedPlan, handleSelectPlan]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with Blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] transition-all duration-300"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-[101] flex items-start sm:items-center justify-center pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] px-4 pointer-events-none overflow-y-auto overflow-x-hidden">
        <div 
          className="relative bg-base w-full max-w-[900px] rounded-[var(--radius-sheet)] shadow-2xl border border-border overflow-y-auto overflow-x-hidden max-h-[calc(100dvh-2rem)] pointer-events-auto my-0 sm:my-4"
          role="dialog"
          aria-modal="true"
          aria-label="Payment"
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }}
            className="absolute right-4 top-4 sm:right-6 sm:top-6 p-2 rounded-full text-tertiary hover:text-primary hover:bg-elevated transition-colors z-20"
            aria-label="Close payment modal"
          >
            <CloseIcon width={20} height={20} />
          </button>

          {/* Render based on payment state */}
          {paymentState === 'plan-selection' && (
            <PlanSelectionView
              plans={PRICING_PLANS}
              onSelectPlan={handleSelectPlan}
              isLoading={isLoading}
            />
          )}

          {paymentState === 'processing' && (
            <ProcessingView planName={selectedPlan?.name || ''} />
          )}

          {paymentState === 'success' && (
            <SuccessView
              planName={selectedPlan?.name || ''}
              creationsAdded={creationsAdded}
              onClose={handleClose}
            />
          )}

          {paymentState === 'error' && (
            <ErrorView
              errorMessage={errorMessage}
              onRetry={handleRetry}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </>
  );
};

// ==========================================
// Plan Selection View
// ==========================================
interface PlanSelectionViewProps {
  plans: PricingPlan[];
  onSelectPlan: (plan: PricingPlan) => void;
  isLoading: boolean;
}

const PlanSelectionView: React.FC<PlanSelectionViewProps> = ({
  plans,
  onSelectPlan,
  isLoading,
}) => {
  return (
    <div className="relative">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gold/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 pt-12 pb-8 text-center px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-primary mb-3 tracking-tight font-display">
          UNLOCK YOUR POTENTIAL
        </h2>
        <p className="text-lg md:text-xl text-gold font-display opacity-80">
          Rich thinking starts with "What's in there?"
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="relative z-10 px-6 pb-10">
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSelect={() => onSelectPlan(plan)}
              isLoading={isLoading}
            />
          ))}
        </div>

        {/* Trust Badge */}
        <div className="text-center mt-8">
          <p className="text-xs text-tertiary flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secured by Razorpay · 256-bit encryption
          </p>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Plan Card Component
// ==========================================
interface PlanCardProps {
  plan: PricingPlan;
  onSelect: () => void;
  isLoading: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, onSelect, isLoading }) => {
  const isPopular = plan.isPopular;

  return (
    <div className={`relative group ${isPopular ? '' : ''}`}>
      {/* Gold Glow for Popular */}
      {isPopular && (
        <div className="absolute -inset-[1px] bg-gradient-to-b from-gold/40 to-transparent rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
      )}

      <div className={`relative h-full flex flex-col p-6 md:p-8 rounded-[var(--radius-card)] border transition-all duration-300 ${
        isPopular 
          ? 'bg-surface border-gold/30 shadow-2xl shadow-gold/5 hover:shadow-gold/10' 
          : 'bg-base border-border hover:border-active hover:shadow-2xl hover:shadow-white/5'
      }`}>
        
        {/* Badge */}
        {plan.badge && (
          <div className="absolute top-0 right-0">
            <div className="bg-gold text-base text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-[var(--radius-card)] uppercase tracking-wider">
              {plan.badge}
            </div>
          </div>
        )}

        {/* Trust Badge */}
        <div className="mb-4 text-left">
          <span className={`text-xs uppercase tracking-widest font-medium ${isPopular ? 'text-gold/60' : 'text-tertiary/60'}`}>
            Account upgrade
          </span>
        </div>

        {/* Plan Name */}
        <h3 className={`text-xl md:text-2xl uppercase font-display mb-2 ${isPopular ? 'text-gold' : 'text-primary'}`}>
          {plan.name}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-3xl md:text-4xl font-bold text-primary">{plan.displayPrice}</span>
          <span className="text-tertiary">one-time</span>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-6 flex-1">
          {plan.features.map((feature, idx) => (
            <li key={idx} className={`flex items-start gap-3 text-sm ${isPopular ? 'text-primary' : 'text-secondary'}`}>
              <svg className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <button
          onClick={onSelect}
          disabled={isLoading}
          className={`w-full py-3 md:py-4 rounded-[var(--radius-input)] font-bold text-[16px] md:text-lg transition-all duration-200 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
            isPopular
              ? 'bg-gold text-base shadow-[0_0_20px_rgba(232,195,125,0.3)]'
              : 'bg-primary text-base shadow-[0_0_20px_rgba(255,255,255,0.1)]'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : (
            isPopular ? `Upgrade to ${plan.name}` : `Get ${plan.name}`
          )}
        </button>
      </div>
    </div>
  );
};

// ==========================================
// Processing View
// ==========================================
interface ProcessingViewProps {
  planName: string;
}

const ProcessingView: React.FC<ProcessingViewProps> = ({ planName }) => {
  return (
    <div className="px-8 py-16 text-center">
      <div className="mb-8">
        <div className="w-16 h-16 mx-auto mb-6 relative">
          <div className="absolute inset-0 rounded-full border-4 border-elevated" />
          <div className="absolute inset-0 rounded-full border-4 border-gold border-t-transparent animate-spin" />
        </div>
        <h3 className="text-2xl font-bold text-primary mb-2">Processing Payment</h3>
        <p className="text-tertiary">
          Please complete your payment in the Razorpay window.
        </p>
        <p className="text-tertiary text-sm mt-2">
          Purchasing: <span className="text-gold">{planName} account</span>
        </p>
      </div>

      <div className="bg-surface rounded-[var(--radius-input)] p-4 max-w-sm mx-auto">
        <p className="text-xs text-tertiary">
          Do not close this window. If checkout does not appear, disable your popup blocker.
        </p>
      </div>
    </div>
  );
};

// ==========================================
// Success View
// ==========================================
interface SuccessViewProps {
  planName: string;
  creationsAdded: number;
  onClose: () => void;
}

const SuccessView: React.FC<SuccessViewProps> = ({ planName, creationsAdded, onClose }) => {
  return (
    <div className="px-8 py-16 text-center relative overflow-hidden">
      {/* Confetti-like Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-4 h-4 bg-gold/20 rounded-full animate-pulse" />
        <div className="absolute top-20 right-20 w-3 h-3 bg-gold/30 rounded-full animate-pulse delay-100" />
        <div className="absolute bottom-20 left-20 w-5 h-5 bg-gold/10 rounded-full animate-pulse delay-200" />
        <div className="absolute bottom-10 right-10 w-2 h-2 bg-gold/40 rounded-full animate-pulse delay-300" />
      </div>

      {/* Success Icon */}
      <div className="relative z-10 mb-8">
        <div className="w-20 h-20 mx-auto mb-6 bg-gold/10 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-3xl font-bold text-primary mb-2">Payment Successful!</h3>
        <p className="text-secondary text-lg">
          Your account is now <span className="text-gold">{planName}</span>
        </p>
      </div>

      {/* Creations Added */}
      <div className="relative z-10 bg-surface rounded-2xl p-6 max-w-sm mx-auto mb-8 border border-border">
        <p className="text-sm text-tertiary mb-2">Creations Added</p>
        <p className="text-4xl font-bold text-gold">+{creationsAdded}</p>
        <p className="text-sm text-tertiary mt-2">creations</p>
      </div>

      {/* Info */}
      <div className="relative z-10 text-sm text-tertiary mb-8">
        <p>An invoice has been sent to your email.</p>
        <p className="mt-1">You can also download it from your Razorpay account.</p>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="relative z-10 bg-gold text-base px-8 py-3 rounded-[var(--radius-input)] font-bold hover:bg-gold-hover transition-colors"
      >
        Start Creating
      </button>
    </div>
  );
};

// ==========================================
// Error View
// ==========================================
interface ErrorViewProps {
  errorMessage: string;
  onRetry: () => void;
  onClose: () => void;
}

const ErrorView: React.FC<ErrorViewProps> = ({ errorMessage, onRetry, onClose }) => {
  return (
    <div className="px-8 py-16 text-center">
      {/* Error Icon */}
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-primary mb-2">Payment Failed</h3>
        <p className="text-secondary">
          {errorMessage || 'Something went wrong with your payment.'}
        </p>
      </div>

      {/* Error Details */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 max-w-md mx-auto mb-8">
        <p className="text-sm text-red-400">
          Your card was not charged. Please try again or use a different payment method.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onRetry}
          className="bg-gold text-base px-8 py-3 rounded-[var(--radius-input)] font-bold hover:bg-gold-hover transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={onClose}
          className="bg-elevated text-primary px-8 py-3 rounded-[var(--radius-input)] font-bold hover:bg-surface transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Support Link */}
      <p className="mt-8 text-sm text-tertiary">
        Need help?{' '}
        <a 
          href="mailto:founder@stiri.in" 
          className="text-gold hover:underline"
        >
          Contact Support
        </a>
      </p>
    </div>
  );
};

