import React, { useState, useEffect } from 'react';
import { CloseIcon, GoogleIcon } from '../../shared/ui/Icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoogleAuth: () => Promise<void>;
  onSendOtp: (phone: string) => Promise<void>;
  onVerifyOtp: (phone: string, code: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

type AuthView = 'phone' | 'otp';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onGoogleAuth,
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
    setLocalError(null);
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setLocalError('Enter a valid 10-digit mobile number');
      return;
    }
    const fullPhone = `91${cleanPhone.slice(-10)}`;
    try {
      await onSendOtp(fullPhone);
      setView('otp');
      setCountdown(30);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to send OTP');
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
      {/* Backdrop with Blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] transition-all duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div
          className="bg-[#121212] w-full max-w-[420px] rounded-3xl shadow-2xl border border-[#2a2a2a] overflow-hidden pointer-events-auto transform transition-all duration-300 scale-100 opacity-100"
          role="dialog"
          aria-modal="true"
        >
          {/* Header Section */}
          <div className="px-8 pt-8 pb-6 text-center relative">
            <button
              onClick={onClose}
              className="absolute right-6 top-6 p-2 rounded-full text-[#6b6b6b] hover:text-[#f5f5f5] hover:bg-[#2a2a2a] transition-colors"
              aria-label="Close"
            >
              <CloseIcon width={20} height={20} />
            </button>

            <h2 className="text-3xl font-semibold text-[#f5f5f5] mb-2 tracking-tight">
              {view === 'otp' ? 'Verify OTP' : 'Sign In'}
            </h2>
            <p className="text-[#a0a0a0] text-sm">
              {view === 'phone' && 'Enter your mobile number to get started'}
              {view === 'otp' && `We sent a 6-digit code to your WhatsApp on +91 ${phone.replace(/\D/g, '').slice(-10)}`}
            </p>
          </div>

          {/* Form Section */}
          <div className="px-8 pb-8">
            {displayError && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <p className="text-sm text-red-400 font-medium">{displayError}</p>
              </div>
            )}

            {/* Phone Input View */}
            {view === 'phone' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#a0a0a0] ml-1">Mobile Number</label>
                  <div className="flex gap-2">
                    <span className="h-12 px-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#6b6b6b] flex items-center text-sm shrink-0 font-medium">+91</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter 10-digit number"
                      className="w-full h-12 px-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#404040] focus:outline-none focus:border-[#c9a962] focus:ring-1 focus:ring-[#c9a962] transition-colors text-lg tracking-wider"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  onClick={handleSendOtp}
                  disabled={isLoading || phone.replace(/\D/g, '').length < 10}
                  className="w-full h-12 bg-[#c9a962] text-black font-semibold rounded-xl hover:bg-[#d4b872] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_-5px_rgba(201,169,98,0.3)]"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-black" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#2a2a2a]"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-wide">
                    <span className="bg-[#121212] px-3 text-[#525252]">Or continue with</span>
                  </div>
                </div>

                {/* Google */}
                <button
                  onClick={onGoogleAuth}
                  disabled={isLoading}
                  className="w-full h-12 bg-white text-black font-medium rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 active:scale-[0.98] transition-all"
                >
                  <GoogleIcon width={20} height={20} />
                  <span>Continue with Google</span>
                </button>
              </div>
            )}

            {/* OTP Verification View */}
            {view === 'otp' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#a0a0a0] ml-1">6-Digit OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="• • • • • •"
                    className="w-full h-14 px-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#404040] focus:outline-none focus:border-[#c9a962] focus:ring-1 focus:ring-[#c9a962] transition-colors text-2xl tracking-[0.5em] text-center font-mono"
                    disabled={isLoading}
                    autoFocus
                    maxLength={6}
                  />
                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otpCode.length !== 6}
                  className="w-full h-12 bg-[#c9a962] text-black font-semibold rounded-xl hover:bg-[#d4b872] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_-5px_rgba(201,169,98,0.3)]"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-black" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying
                    </span>
                  ) : 'Verify & Sign In'}
                </button>

                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={() => { setView('phone'); setOtpCode(''); setLocalError(null); }}
                    className="text-sm text-[#6b6b6b] hover:text-[#a0a0a0] transition-colors"
                  >
                    Change number
                  </button>
                  <button
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || isLoading}
                    className="text-sm text-[#c9a962] hover:text-[#d4b872] disabled:text-[#525252] disabled:cursor-not-allowed transition-colors"
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            )}

            <p className="mt-6 text-xs text-[#525252] text-center px-4 leading-relaxed">
              By continuing, you agree to our{' '}
              <button className="text-[#808080] hover:text-[#c9a962] transition-colors">Terms of Service</button>
              {' '}and{' '}
              <button className="text-[#808080] hover:text-[#c9a962] transition-colors">Privacy Policy</button>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
