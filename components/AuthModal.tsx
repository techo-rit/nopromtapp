import React, { useState } from 'react';
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validation
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

    // Reset form on success
    setEmail('');
    setPassword('');
    setName('');
  };

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    setLocalError(null);
    setEmail('');
    setPassword('');
    setName('');
  };

  const displayError = localError || error;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-[#141414] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-[#2a2a2a]">
          {/* Header */}
          <div className="relative px-8 py-6 border-b border-[#2a2a2a] flex items-center justify-between">
            <h2 className="text-[28px] font-semibold tracking-[0.005em] leading-[1.2] text-[#f5f5f5]" style={{fontFamily: 'var(--font-sans)'}}>
              {activeTab === 'login' ? 'Welcome Back' : 'Join nopromt.ai'}
            </h2>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors focus:outline-none flex items-center justify-center text-[#a0a0a0] hover:text-[#f5f5f5]"
              aria-label="Close modal"
            >
              <CloseIcon width={24} height={24} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#2a2a2a] px-8 pt-6">
            <button
              onClick={() => handleTabChange('login')}
              className={`min-h-[44px] pb-4 px-4 -mx-4 text-base font-medium transition-colors relative ${
                activeTab === 'login'
                  ? 'text-[#f5f5f5]'
                  : 'text-[#6b6b6b] hover:text-[#a0a0a0]'
              }`}
            >
              Log In
              {activeTab === 'login' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c9a962] rounded-full" />
              )}
            </button>
            <button
              onClick={() => handleTabChange('signup')}
              className={`min-h-[44px] pb-4 px-4 -mx-4 text-base font-medium transition-colors relative ${
                activeTab === 'signup'
                  ? 'text-[#f5f5f5]'
                  : 'text-[#6b6b6b] hover:text-[#a0a0a0]'
              }`}
            >
              Sign Up
              {activeTab === 'signup' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c9a962] rounded-full" />
              )}
            </button>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            {/* Error Message */}
            {displayError && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                <p className="text-sm text-red-400 font-medium">{displayError}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-[#a0a0a0] mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full min-h-[48px] px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#c9a962]/50 focus:border-[#c9a962] transition-all"
                    disabled={isLoading}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#a0a0a0] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full min-h-[48px] px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#c9a962]/50 focus:border-[#c9a962] transition-all"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#a0a0a0] mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[48px] px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#c9a962]/50 focus:border-[#c9a962] transition-all"
                  disabled={isLoading}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[48px] mt-6 py-3 bg-[#1a1a1a] text-[#f5f5f5] font-semibold rounded-xl border border-[#3a3a3a] hover:bg-[#2a2a2a] hover:border-[#c9a962]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? 'Loading...' : activeTab === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            </form>

            {/* Divider */}
            <div className="relative mt-8 mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#2a2a2a]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-[#141414] text-[#6b6b6b]">Or continue with</span>
              </div>
            </div>

            {/* Google Sign In */}
            <button
              onClick={onGoogleAuth}
              disabled={isLoading}
              type="button"
              className="w-full min-h-[48px] py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl font-medium text-[#f5f5f5] hover:bg-[#1a1a1a] hover:border-[#3a3a3a] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <GoogleIcon width={20} height={20} />
              Continue with Google
            </button>

            {/* Terms */}
            <p className="mt-6 text-xs text-[#6b6b6b] text-center">
              By continuing, you agree to our{' '}
              <button className="text-[#a0a0a0] hover:text-[#c9a962] font-medium transition-colors">
                Terms of Service
              </button>
              {' '}and{' '}
              <button className="text-[#a0a0a0] hover:text-[#c9a962] font-medium transition-colors">
                Privacy Policy
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
