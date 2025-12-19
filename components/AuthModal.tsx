import React, { useState, useEffect } from 'react';
import { CloseIcon, GoogleIcon } from './Icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignUp: (email: string, password: string, name: string) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
  onGoogleAuth: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

type AuthTab = 'login' | 'signup';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSignUp,
  onLogin,
  onGoogleAuth,
  isLoading,
  error,
}) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setLocalError(null);
      setEmail('');
      setPassword('');
      setName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    if (activeTab === 'signup') {
      if (!name) {
        setLocalError('Please enter your name');
        return;
      }
      await onSignUp(email, password, name);
    } else {
      await onLogin(email, password);
    }
  };

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    setLocalError(null);
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
              {activeTab === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-[#a0a0a0] text-sm">
              {activeTab === 'login' 
                ? 'Enter your details to access your account.' 
                : 'Join the community and start creating.'}
            </p>
          </div>

          {/* Toggle Tabs (Pill Style) */}
          <div className="px-8 mb-6">
            <div className="p-1 bg-[#1a1a1a] rounded-xl flex relative">
              <button
                onClick={() => handleTabChange('login')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 z-10 ${
                  activeTab === 'login' 
                    ? 'text-[#0a0a0a] bg-[#f5f5f5] shadow-sm' 
                    : 'text-[#6b6b6b] hover:text-[#a0a0a0]'
                }`}
              >
                Log In
              </button>
              <button
                onClick={() => handleTabChange('signup')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 z-10 ${
                  activeTab === 'signup' 
                    ? 'text-[#0a0a0a] bg-[#f5f5f5] shadow-sm' 
                    : 'text-[#6b6b6b] hover:text-[#a0a0a0]'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Form Section */}
          <div className="px-8 pb-8">

            {/* Social Login */}
            <button
              onClick={onGoogleAuth}
              disabled={isLoading}
              className="w-full h-12 bg-white text-black font-medium rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 active:scale-[0.98] transition-all mb-6"
            >
              <GoogleIcon width={20} height={20} />
              <span>Continue with Google</span>
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#2a2a2a]"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wide">
                <span className="bg-[#121212] px-3 text-[#525252]">Or with email</span>
              </div>
            </div>

            {displayError && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <p className="text-sm text-red-400 font-medium">{displayError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#a0a0a0] ml-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full h-12 px-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#404040] focus:outline-none focus:border-[#c9a962] focus:ring-1 focus:ring-[#c9a962] transition-colors"
                    disabled={isLoading}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#a0a0a0] ml-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-12 px-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#404040] focus:outline-none focus:border-[#c9a962] focus:ring-1 focus:ring-[#c9a962] transition-colors"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#a0a0a0] ml-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#404040] focus:outline-none focus:border-[#c9a962] focus:ring-1 focus:ring-[#c9a962] transition-colors"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 mt-2 bg-[#c9a962] text-black font-semibold rounded-xl hover:bg-[#d4b872] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_-5px_rgba(201,169,98,0.3)]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing
                  </span>
                ) : (
                  activeTab === 'login' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

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