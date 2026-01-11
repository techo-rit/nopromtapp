// src/App.tsx
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from "react-router-dom";

// Components
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { AuthModal } from "./components/AuthModal";
import { PaymentModal } from "./components/PaymentModal";
import { TemplateExecution } from "./components/TemplateExecution";

// Routes & Services
import { Home } from "./routes/Home";
import { StackView } from "./routes/StackView";
import { authService } from "./services/authService";
import { searchTemplates } from "./utils/searchLogic";
import { useDebounce } from "./hooks/useDebounce";
import { STACKS, TEMPLATES, TEMPLATES_BY_ID, TRENDING_TEMPLATE_IDS } from "./constants";
import type { Template, User, NavCategory } from "./types";

const STORAGE_KEY_NAV = "nopromt_nav";

const TemplateRoute = ({ user, onLoginRequired, onBack }: any) => {
  const { templateId } = useParams();
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
  
  // FIX: Safety mechanism to prevent infinite loading
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  
  // --- Modals ---
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  const searchResults = useMemo(() => searchTemplates(debouncedSearchQuery, TEMPLATES), [debouncedSearchQuery]);
  const trendingTemplates = useMemo(() => TRENDING_TEMPLATE_IDS.map((id) => TEMPLATES_BY_ID.get(id)).filter((t): t is Template => !!t), []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY_NAV, activeNav); }, [activeNav]);

  // --- AUTH INITIALIZATION FIX ---
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // 1. Explicit Check: Get session immediately (don't wait for listener)
        const initialUser = await authService.getCurrentUser();
        if (mounted && initialUser) {
          setUser(initialUser);
        }
      } catch (e) {
        console.error("Auth init failed", e);
      } finally {
        // 2. Guaranteed Unlock: Remove loading screen regardless of outcome
        if (mounted) setIsGlobalLoading(false);
      }
    };

    // 3. Listener: Handles subsequent updates (sign out, token refresh)
    const subscription = authService.onAuthStateChange((updatedUser) => {
      if (!mounted) return;
      setUser(updatedUser);
      // Ensure loading is off if listener fires first
      setIsGlobalLoading(false); 
    });

    initAuth();

    // 4. Safety Timeout: Absolute failsafe for blank screen
    const safetyTimer = setTimeout(() => {
        if (mounted && isGlobalLoading) setIsGlobalLoading(false);
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      if (subscription?.unsubscribe) subscription.unsubscribe();
    };
  }, []);

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
    if (searchQuery) { setSearchQuery(""); return; }
    if (location.pathname.includes('/template/')) { navigate(-1); } else { navigate('/'); }
  };

  const handleAuthAction = async (action: () => Promise<any>) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await action();
      if (result) setUser(result);
      setShowAuthModal(false);
    } catch (error: any) {
      setAuthError(error.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  // Render Loading Screen
  if (isGlobalLoading) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#0a0a0a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading Nopromt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col bg-[#0a0a0a] text-[#f5f5f5] font-sans overflow-hidden">
      <div className="shrink-0 z-50">
        <Header
          activeNav={activeNav}
          onNavClick={handleNavClick}
          user={user}
          onSignIn={() => setShowAuthModal(true)}
          onLogout={async () => { await authService.logout(); }}
          onUpgrade={() => user ? setShowPaymentModal(true) : setShowAuthModal(true)}
          isLoading={isGlobalLoading}
          isSecondaryPage={location.pathname !== '/'}
          onBack={handleBack}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSignUp={(e, p, n) => handleAuthAction(() => authService.signUp(e, p, n))}
        onLogin={(e, p) => handleAuthAction(() => authService.login(e, p))}
        onGoogleAuth={() => handleAuthAction(() => authService.signInWithGoogle())}
        isLoading={authLoading}
        error={authError}
      />

      {user && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          user={user}
          onPaymentSuccess={async () => {
             const u = await authService.getCurrentUser();
             if (u) setUser(u);
          }}
        />
      )}
      
      <main className="flex-1 relative w-full h-full overflow-hidden">
        <Routes>
          <Route path="/" element={<Home activeNav={activeNav} searchQuery={searchQuery} searchResults={searchResults} trendingTemplates={trendingTemplates} onSelectStack={(s) => navigate(`/stack/${s.id}`)} onSelectTemplate={(t) => navigate(`/template/${t.id}`)} />} />
          <Route path="/stack/:stackId" element={<StackView onSelectTemplate={(t) => navigate(`/template/${t.id}`)} />} />
          <Route path="/template/:templateId" element={<TemplateRoute user={user} onLoginRequired={() => setShowAuthModal(true)} onBack={handleBack} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <div className="shrink-0 z-50">
        <BottomNav activeNav={activeNav} onNavClick={handleNavClick} user={user} onSignIn={() => setShowAuthModal(true)} onLogout={async () => { await authService.logout(); }} />
      </div>
    </div>
  );
};

export default App;