// src/App.tsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";

// Components
import { Header } from "./features/layout/Header";
import { BottomNav } from "./features/layout/BottomNav";
import { FloatingSearch } from "./features/layout/FloatingSearch";
import { AuthModal } from "./features/auth/AuthModal";
import { PaymentModal } from "./features/payments/PaymentModal";
import { OnboardingModal } from "./features/profile/OnboardingModal";
import { ProfilePage } from "./features/pages/ProfilePage";
import { CartDrawer } from "./features/shop/CartDrawer";
import { ProductPage } from "./features/shop/ProductPage";

// New Routes
import { Home } from "./features/pages/Home";
import { StackView } from "./features/pages/StackView";
import { ChangingRoom } from "./features/templates/ChangingRoom";
import { ForYouFeed } from "./features/feed/ForYouFeed";

// Services & Utils
import { authService } from "./features/auth/authService";
import { profileService } from "./features/profile/profileService";
import { useTemplates } from "./shared/hooks/useTemplates";
import { useWishlist } from "./shared/hooks/useWishlist";
import type { User, UserProfile } from "./types";

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- Global State ---
  const [user, setUser] = useState<User | null>(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);

  // --- Templates from API ---
  const { templatesByStack, trendingTemplates, isLoading: templatesLoading } = useTemplates();

  // --- Wishlist ---
  const { items: wishlistItems, wishlistedIds, isLoading: wishlistLoading, toggle: toggleWishlist } = useWishlist(!!user);

  // --- Shopify ---
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [cartRefreshTrigger, setCartRefreshTrigger] = useState(0);

  // --- Modals ---
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // --- Search (Header-controlled) ---
  const [searchQuery, setSearchQuery] = useState("");
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.length > 0 && location.pathname !== '/') navigate('/');
  };
  const authModalHistoryActiveRef = useRef(false);
  const paymentModalHistoryActiveRef = useRef(false);
  const onboardingModalHistoryActiveRef = useRef(false);
  const ignoreNextModalPopRef = useRef(false);

  // --- Onboarding ---
  const [onboardingPercent, setOnboardingPercent] = useState<number>(100);
  const [onboardingSteps, setOnboardingSteps] = useState<number>(6);

  const syncUserFromProfile = useCallback((profile: UserProfile) => {
    setUser((current) => {
      if (!current) return current;
      return {
        ...current,
        name: profile.name || current.name,
        phone: profile.phone,
        ageRange: profile.ageRange,
        colors: profile.colors || [],
        styles: profile.styles || [],
        fit: profile.fit,
        bodyType: profile.bodyType,
        skinTone: profile.skinTone,
        avatarUrl: profile.avatarUrl,
        profilePhotoUrl: profile.profilePhotoUrl,
        isOnboardingComplete: profile.isOnboardingComplete,
        accountType: profile.accountType,
        monthlyQuota: profile.monthlyQuota,
        monthlyUsed: profile.monthlyUsed,
        extraCredits: profile.extraCredits,
        creationsLeft: profile.creationsLeft,
      };
    });
  }, []);

  // --- Effects ---
  useEffect(() => {
    let mounted = true;
    
    // Initial Load
    const cachedUser = authService.getCachedUser();
    if (cachedUser) {
      setUser(cachedUser);
      setIsGlobalLoading(false);
    }

    authService.fetchCurrentUser().then((initialUser) => {
      if (mounted) {
        setUser(initialUser);
        setIsGlobalLoading(false); 
      }
    });

    // Auth Listener
    const subscription = authService.onAuthStateChange((updatedUser) => {
      if (mounted) {
        setUser(updatedUser);
        setIsGlobalLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (subscription?.unsubscribe) subscription.unsubscribe();
    };
  }, []);

  // Fetch onboarding status whenever user changes
  useEffect(() => {
    if (!user) {
      setOnboardingPercent(100);
      setOnboardingSteps(6);
      return;
    }
    profileService.getProfile().then((data) => {
      if (data) {
        setOnboardingPercent(data.onboardingPercent ?? 100);
        setOnboardingSteps(data.onboardingSteps ?? 6);
        // Auto-show onboarding after first login if not complete
        if (data.profile && !data.profile.isOnboardingComplete) {
          openOnboardingModal();
        }
      }
    }).catch(() => { /* ignore */ });
  }, [user]);

  // --- Handlers ---
  const handleBack = () => {
    if (location.pathname !== '/') {
       navigate(-1);
    } else {
       navigate('/');
    }
  };

  // Auth & Payments
  const handleAuthAction = async (action: () => Promise<any>, successMsg?: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await action();
      if (result) setUser(result); // If action returns a user
      closeAuthModal();
    } catch (error: any) {
      setAuthError(error.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const openAuthModal = useCallback(() => {
    if (!authModalHistoryActiveRef.current) {
      window.history.pushState({ authModal: true }, "", window.location.href);
      authModalHistoryActiveRef.current = true;
    }
    setShowAuthModal(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    if (authModalHistoryActiveRef.current) {
      ignoreNextModalPopRef.current = true;
      window.history.back();
      authModalHistoryActiveRef.current = false;
    }
    setShowAuthModal(false);
  }, []);

  const openPaymentModal = useCallback(() => {
    if (!paymentModalHistoryActiveRef.current) {
      window.history.pushState({ paymentModal: true }, "", window.location.href);
      paymentModalHistoryActiveRef.current = true;
    }
    setShowPaymentModal(true);
  }, []);

  const closePaymentModal = useCallback(() => {
    if (paymentModalHistoryActiveRef.current) {
      ignoreNextModalPopRef.current = true;
      window.history.back();
      paymentModalHistoryActiveRef.current = false;
    }
    setShowPaymentModal(false);
  }, []);

  const openOnboardingModal = useCallback(() => {
    if (!onboardingModalHistoryActiveRef.current) {
      window.history.pushState({ onboardingModal: true }, "", window.location.href);
      onboardingModalHistoryActiveRef.current = true;
    }
    setShowOnboardingModal(true);
  }, []);

  const closeOnboardingModal = useCallback(() => {
    if (onboardingModalHistoryActiveRef.current) {
      ignoreNextModalPopRef.current = true;
      window.history.back();
      onboardingModalHistoryActiveRef.current = false;
    }
    setShowOnboardingModal(false);
  }, []);

  const handleOnboardingComplete = useCallback(async () => {
    closeOnboardingModal();
    try {
      const data = await profileService.getProfile(true);
      if (data) {
        setOnboardingPercent(data.onboardingPercent);
        setOnboardingSteps(data.onboardingSteps);
        syncUserFromProfile(data.profile);
      }
    } catch { /* ignore */ }
  }, [closeOnboardingModal, syncUserFromProfile]);

  const handleProfileUpdate = useCallback(async () => {
    try {
      const data = await profileService.getProfile(true);
      if (data) {
        setOnboardingPercent(data.onboardingPercent);
        setOnboardingSteps(data.onboardingSteps);
        syncUserFromProfile(data.profile);
      }
    } catch { /* ignore */ }
  }, [syncUserFromProfile]);

  useEffect(() => {
    const onPopState = () => {
      if (ignoreNextModalPopRef.current) {
        ignoreNextModalPopRef.current = false;
        return;
      }

      if (onboardingModalHistoryActiveRef.current) {
        onboardingModalHistoryActiveRef.current = false;
        setShowOnboardingModal(false);
        return;
      }

      if (paymentModalHistoryActiveRef.current) {
        paymentModalHistoryActiveRef.current = false;
        setShowPaymentModal(false);
        return;
      }

      if (authModalHistoryActiveRef.current) {
        authModalHistoryActiveRef.current = false;
        setShowAuthModal(false);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleLogout = async () => {
    const nextUser = await authService.logout();
    setUser(nextUser);
    profileService.clearCache();
  };

  // --- Shopify Handlers ---
  const handleCartUpdate = useCallback((count?: number) => {
    if (typeof count === 'number') setCartCount(count);
  }, []);

  const triggerCartRefresh = useCallback(() => {
    setCartRefreshTrigger(prev => prev + 1);
  }, []);

  const openCartDrawer = useCallback(() => {
    setShowCartDrawer(true);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col bg-[#0a0a0a] text-[#f5f5f5] font-sans overflow-hidden">
      
      {/* HEADER */}
      <div className="shrink-0 z-50">
        <Header
          user={user}
          onSignIn={openAuthModal}
          onLogout={handleLogout}
          onUpgrade={() => user ? openPaymentModal() : openAuthModal()}
          isLoading={isGlobalLoading}
          isSecondaryPage={location.pathname !== '/'}
          onBack={handleBack}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          cartCount={user ? cartCount : 0}
          onCartClick={user ? openCartDrawer : undefined}
        />
      </div>

      {/* MODALS */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        onSendOtp={async (phone) => {
          setAuthLoading(true);
          setAuthError(null);
          try {
            await authService.sendOtp(phone);
          } catch (err: any) {
            setAuthError(err.message || 'Failed to send OTP');
            throw err;
          } finally {
            setAuthLoading(false);
          }
        }}
        onVerifyOtp={async (phone, code) => {
          await handleAuthAction(() => authService.verifyOtp(phone, code));
        }}
        isLoading={authLoading}
        error={authError}
      />

      {user && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={closePaymentModal}
          user={user}
          onPaymentSuccess={async () => {
             const u = await authService.getCurrentUser();
             if (u) setUser(u);
          }}
        />
      )}

      {user && (
        <OnboardingModal
          isOpen={showOnboardingModal}
          onClose={closeOnboardingModal}
          onComplete={handleOnboardingComplete}
          userName={user.name || ''}
        />
      )}
      
      {/* MAIN CONTENT */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        <Routes>
          <Route 
            path="/" 
            element={
              <Home 
                trendingTemplates={trendingTemplates}
                templatesByStack={templatesByStack}
                isLoading={templatesLoading}
                onSelectTemplate={(t) => navigate(`/product/${t.id}`)}
                onTryOn={(t) => user ? navigate(`/changing-room?product=${t.id}`) : openAuthModal()}
                user={user}
                onLoginRequired={openAuthModal}
                onboardingPercent={onboardingPercent}
                onOpenOnboarding={openOnboardingModal}
                wishlistedIds={user ? wishlistedIds : undefined}
                onToggleWishlist={user ? toggleWishlist : undefined}
              />
            } 
          />
          <Route 
            path="/stack/:stackId" 
            element={<StackView templatesByStack={templatesByStack} onSelectTemplate={(t) => navigate(`/product/${t.id}`)} />} 
          />
          <Route 
            path="/template/:templateId" 
            element={<Navigate to="/" replace />}
          />
          <Route
            path="/product/:handle"
            element={
              <ProductPage
                onCartUpdate={(count) => { handleCartUpdate(count); triggerCartRefresh(); }}
                wishlistedIds={user ? wishlistedIds : undefined}
                onToggleWishlist={user ? toggleWishlist : undefined}
                onLoginRequired={openAuthModal}
                user={user}
              />
            }
          />
          <Route
            path="/changing-room"
            element={
              <ChangingRoom
                user={user}
                onLoginRequired={openAuthModal}
                onProfilePhotoSaved={handleProfileUpdate}
              />
            }
          />
          <Route
            path="/profile"
            element={
              user ? (
                <ProfilePage
                  user={user}
                  onProfileUpdate={handleProfileUpdate}
                  onBack={() => navigate('/')}
                  onLogout={handleLogout}
                  onUpgrade={openPaymentModal}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/for-you"
            element={
              <ForYouFeed
                user={user}
                onLoginRequired={openAuthModal}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* CART DRAWER */}
      <CartDrawer
        isOpen={showCartDrawer}
        onClose={() => setShowCartDrawer(false)}
        onCartUpdate={handleCartUpdate}
        refreshTrigger={cartRefreshTrigger}
        wishlistItems={wishlistItems}
        wishlistLoading={wishlistLoading}
        onRemoveWishlistItem={toggleWishlist}
        onProductDetails={(handle) => { setShowCartDrawer(false); navigate(`/product/${handle}`); }}
      />

      {/* FLOATING SEARCH (mobile only, home page) */}
      <FloatingSearch searchQuery={searchQuery} onSearchChange={handleSearchChange} />

      {/* FOOTER */}
      <div className="shrink-0 z-50">
        <BottomNav
          cartCount={user ? cartCount : 0}
          onCartClick={user ? openCartDrawer : undefined}
        />
      </div>
    </div>
  );
};

export default App;
