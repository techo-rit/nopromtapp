import React, { useState, useEffect } from 'react';
import { CloseIcon } from '../../shared/ui/Icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendOtp: (phone: string) => Promise<void>;
  onVerifyOtp: (phone: string, code: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

type AuthView = 'phone' | 'otp';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSendOtp,
  onVerifyOtp,
  isLoading,
  error,
}) => {
  const [view, setView] = useState<AuthView>('phone');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setLocalError(null);
      setView('phone');
      setPhone('');
      setOtpCode('');
      setCountdown(0);
    }
  }, [isOpen]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    if (isSendingOtp) return;
    setLocalError(null);
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setLocalError('Enter a valid 10-digit mobile number');
      return;
    }
    const fullPhone = `91${cleanPhone.slice(-10)}`;
    setIsSendingOtp(true);
    try {
      await onSendOtp(fullPhone);
      setView('otp');
      setCountdown(30);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLocalError(null);
    if (otpCode.length !== 6) {
      setLocalError('Enter the 6-digit OTP');
      return;
    }
    const fullPhone = `91${phone.replace(/\D/g, '').slice(-10)}`;
    await onVerifyOtp(fullPhone, otpCode);
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLocalError(null);
    const fullPhone = `91${phone.replace(/\D/g, '').slice(-10)}`;
    try {
      await onSendOtp(fullPhone);
      setCountdown(30);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to resend OTP');
    }
  };

  const displayError = localError || error;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-all duration-300"
        style={{ zIndex: 'var(--z-modal)' as unknown as number }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 pointer-events-none"
        style={{ zIndex: 'calc(var(--z-modal) + 1)' as unknown as number }}
      >
        <div
          className="bg-surface w-full max-w-[420px] rounded-[var(--radius-sheet)] shadow-[0_24px_80px_rgba(0,0,0,0.6)] border border-border overflow-hidden pointer-events-auto"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center relative">
            <button
              onClick={onClose}
              className="absolute right-5 top-5 p-2 rounded-full text-tertiary hover:text-primary hover:bg-elevated transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <CloseIcon width={20} height={20} />
            </button>

            <h2 className="text-[28px] font-bold text-primary mb-2 tracking-tight font-display">
              {view === 'otp' ? 'Verify OTP' : 'Sign In'}
            </h2>
            <p className="text-secondary text-sm leading-relaxed">
              {view === 'phone' && 'Enter your mobile number to get started'}
              {view === 'otp' && `We sent a 6-digit code to your WhatsApp on +91 ${phone.replace(/\D/g, '').slice(-10)}`}
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            {displayError && (
              <div className="mb-6 p-3 bg-error/10 border border-error/20 rounded-[var(--radius-input)] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-error" />
                <p className="text-sm text-error font-medium">{displayError}</p>
              </div>
            )}

            {/* Phone Input */}
            {view === 'phone' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-secondary ml-1">Mobile Number</label>
                  <div className="flex gap-2">
                    <span className="h-12 px-3 bg-base border border-border rounded-[var(--radius-input)] text-tertiary flex items-center text-sm shrink-0 font-medium">+91</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !isLoading && phone.replace(/\D/g, '').length >= 10) handleSendOtp(); }}
                      placeholder="Enter 10-digit number"
                      className="w-full h-12 px-4 bg-base border border-border rounded-[var(--radius-input)] text-primary placeholder-tertiary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors text-lg tracking-wider"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  onClick={handleSendOtp}
                  disabled={isLoading || isSendingOtp || phone.replace(/\D/g, '').length < 10}
                  className="w-full h-12 bg-gold text-base font-semibold rounded-[var(--radius-input)] hover:bg-gold-hover active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_24px_-4px_rgba(232,195,125,0.25)]"
                  style={{ transitionTimingFunction: 'var(--ease-spring)' }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-[--color-base]" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending OTP
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.69 0-3.281-.46-4.645-1.27l-.332-.196-2.867.852.852-2.867-.197-.332A7.947 7.947 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
                      </svg>
                      Send OTP via WhatsApp
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* OTP Verification */}
            {view === 'otp' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-secondary ml-1">6-Digit OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !isLoading && otpCode.length === 6) handleVerifyOtp(); }}
                    placeholder="- - - - - -"
                    className="w-full h-14 px-4 bg-base border border-border rounded-[var(--radius-input)] text-primary placeholder-tertiary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors text-2xl tracking-[0.5em] text-center font-mono"
                    disabled={isLoading}
                    autoFocus
                    maxLength={6}
                  />
                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otpCode.length !== 6}
                  className="w-full h-12 bg-gold text-base font-semibold rounded-[var(--radius-input)] hover:bg-gold-hover active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_24px_-4px_rgba(232,195,125,0.25)]"
                  style={{ transitionTimingFunction: 'var(--ease-spring)' }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-[--color-base]" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verifying
                    </span>
                  ) : 'Verify & Sign In'}
                </button>

                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={() => { setView('phone'); setOtpCode(''); setLocalError(null); }}
                    className="text-sm text-tertiary hover:text-secondary transition-colors"
                  >
                    Change number
                  </button>
                  <button
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || isLoading}
                    className="text-sm text-gold hover:text-gold-hover disabled:text-tertiary disabled:cursor-not-allowed transition-colors"
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            )}

            <p className="mt-6 text-xs text-tertiary text-center px-4 leading-relaxed">
              By continuing, you agree to our{' '}
              <button className="text-secondary hover:text-gold transition-colors">Terms of Service</button>
              {' '}and{' '}
              <button className="text-secondary hover:text-gold transition-colors">Privacy Policy</button>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
