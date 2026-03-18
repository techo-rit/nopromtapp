// src/App.tsx
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from "react-router-dom";

// Components
import { Header } from "./features/layout/Header";
import { BottomNav } from "./features/layout/BottomNav";
import { AuthModal } from "./features/auth/AuthModal";
import { PaymentModal } from "./features/payments/PaymentModal";
import { TemplateExecution } from "./features/templates/TemplateExecution";
import { OnboardingModal } from "./features/profile/OnboardingModal";
import { ProfilePage } from "./features/pages/ProfilePage";

// New Routes
import { Home } from "./features/pages/Home";
import { StackView } from "./features/pages/StackView";

// Services & Utils
import { authService } from "./features/auth/authService";
import { profileService } from "./features/profile/profileService";
import { searchTemplates } from "./shared/utils/searchLogic";
import { useDebounce } from "./shared/hooks/useDebounce";
import { STACKS, TEMPLATES, TEMPLATES_BY_ID, TRENDING_TEMPLATE_IDS } from "./data/constants";
import type { Template, User, UserProfile, NavCategory, Stack } from "./types";

// Storage Helper
const STORAGE_KEY_NAV = "stiri_nav";

// Wrapper for Template Route (keeps access to User/Auth logic)
const TemplateRoute = ({ 
  user, 
  onLoginRequired, 
  onBack 
}: { 
  user: User | null, 
  onLoginRequired: () => void,
  onBack: () => void 
}) => {
  const { templateId } = useParams();
  // O(1) lookup instead of O(n) find
  const selectedTemplate = templateId ? TEMPLATES_BY_ID.get(templateId) : undefined;
  if (!selectedTemplate) return <Navigate to="/" replace />;
  
  const stack = STACKS.find(s => s.id === selectedTemplate.stackId);
  if (!stack) return <Navigate to="/" replace />;
  
  return (
    <TemplateExecution
      template={selectedTemplate}
      stack={stack}
      onBack={onBack}
      onLoginRequired={onLoginRequired}
      user={user}
    />
  );
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- Global State ---
  const [activeNav, setActiveNav] = useState<NavCategory>(() => {
    return (localStorage.getItem(STORAGE_KEY_NAV) as NavCategory) || "Creators";
  });
  const [user, setUser] = useState<User | null>(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  
  // --- Modals ---
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const authModalHistoryActiveRef = useRef(false);
  const paymentModalHistoryActiveRef = useRef(false);
  const onboardingModalHistoryActiveRef = useRef(false);
  const ignoreNextModalPopRef = useRef(false);

  // --- Onboarding ---
  const [onboardingPercent, setOnboardingPercent] = useState<number>(100);
  const [onboardingSteps, setOnboardingSteps] = useState<number>(5);

  // --- Search (debounced to prevent O(n) search on every keystroke) ---
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  const searchResults = useMemo(
    () => searchTemplates(debouncedSearchQuery, TEMPLATES), 
    [debouncedSearchQuery]
  );
  
  const trendingTemplates = useMemo(
    () => TRENDING_TEMPLATE_IDS.map((id) => TEMPLATES_BY_ID.get(id)).filter((t): t is Template => !!t),
    []
  );

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
        avatarUrl: profile.avatarUrl,
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
    localStorage.setItem(STORAGE_KEY_NAV, activeNav);
  }, [activeNav]);

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
      setOnboardingSteps(5);
      return;
    }
    profileService.getProfile().then((data) => {
      if (data) {
        setOnboardingPercent(data.onboardingPercent ?? 100);
        setOnboardingSteps(data.onboardingSteps ?? 5);
        // Auto-show onboarding after first login if not complete
        if (data.profile && !data.profile.isOnboardingComplete) {
          openOnboardingModal();
        }
      }
    }).catch(() => { /* ignore */ });
  }, [user]);

  // --- Handlers ---
  const handleNavClick = (category: NavCategory) => {
    setActiveNav(category);
    setSearchQuery("");
    navigate('/');
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.length > 0 && location.pathname !== '/') navigate('/');
  };

  const handleBack = () => {
    if (searchQuery) {
        setSearchQuery("");
        return;
    }

    // FIX: Split logic so TypeScript knows exactly which overload to use
    if (location.pathname.includes('/template/')) {
       navigate(-1); // "Go back one step" (Mode: number)
    } else {
       navigate('/'); // "Go to home" (Mode: string)
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

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col bg-[#0a0a0a] text-[#f5f5f5] font-sans overflow-hidden">
      
      {/* HEADER */}
      <div className="shrink-0 z-50">
        <Header
          activeNav={activeNav}
          onNavClick={handleNavClick}
          user={user}
          onSignIn={openAuthModal}
          onLogout={handleLogout}
          onUpgrade={() => user ? openPaymentModal() : openAuthModal()}
          isLoading={isGlobalLoading}
          isSecondaryPage={location.pathname !== '/'}
          onBack={handleBack}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
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
                activeNav={activeNav}
                searchQuery={searchQuery}
                searchResults={searchResults}
                trendingTemplates={trendingTemplates}
                onSelectStack={(s) => navigate(`/stack/${s.id}`)}
                onSelectTemplate={(t) => navigate(`/template/${t.id}`)}
                user={user}
                onboardingPercent={onboardingPercent}
                onOpenOnboarding={openOnboardingModal}
              />
            } 
          />
          <Route 
            path="/stack/:stackId" 
            element={<StackView onSelectTemplate={(t) => navigate(`/template/${t.id}`)} />} 
          />
          <Route 
            path="/template/:templateId" 
            element={
              <TemplateRoute 
                user={user} 
                onLoginRequired={openAuthModal} 
                onBack={handleBack} 
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* FOOTER */}
      <div className="shrink-0 z-50">
        <BottomNav
          activeNav={activeNav}
          onNavClick={handleNavClick}
          user={user}
          onSignIn={openAuthModal}
          onLogout={handleLogout}
          onUpgrade={() => user ? openPaymentModal() : openAuthModal()}
        />
      </div>
    </div>
  );
};

export default App;
