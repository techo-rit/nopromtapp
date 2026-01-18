// src/App.tsx
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from "react-router-dom";

// Components
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { AuthModal } from "./components/AuthModal";
import { PaymentModal } from "./components/PaymentModal";
import { TemplateExecution } from "./components/TemplateExecution";

// Routes
import { Home } from "./routes/Home";
import { StackView } from "./routes/StackView";

// Services & Utils
import { authService } from "./services/authService";
import { searchTemplates } from "./utils/searchLogic";
import { useDebounce } from "./hooks/useDebounce";
import { STACKS, TEMPLATES, TEMPLATES_BY_ID, TRENDING_TEMPLATE_IDS } from "./constants";
import type { Template, User, NavCategory } from "./types";

const STORAGE_KEY_NAV = "nopromt_nav";

// --- Route Wrapper ---
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

// --- Main App Component ---
const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [activeNav, setActiveNav] = useState<NavCategory>(() => {
    return (localStorage.getItem(STORAGE_KEY_NAV) as NavCategory) || "Creators";
  });
  
  const [user, setUser] = useState<User | null>(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  
  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Search
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

  // --- Auth Initialization ---
  useEffect(() => {
    let mounted = true;

    // 1. Setup the listener (The single source of truth)
    const subscription = authService.onAuthStateChange((updatedUser) => {
      if (!mounted) return;
      
      console.log("[App] Auth update:", updatedUser?.email ?? "Logged out");
      setUser(updatedUser);
      setIsGlobalLoading(false); // Stop loading once Supabase tells us the state
    });

    // 2. Initial check (Handles cases where listener might be slightly delayed)
    authService.getCurrentUser().then((initialUser) => {
      if (mounted && initialUser) {
        setUser(initialUser);
        setIsGlobalLoading(false);
      } else if (mounted) {
         // If no user found initially, we still wait for listener
         // unless we want to assume logged out immediately.
         // Usually listener fires 'INITIAL_SESSION' quickly.
      }
    });

    return () => {
      mounted = false;
      if (subscription?.unsubscribe) subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_NAV, activeNav);
  }, [activeNav]);

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
    if (location.pathname.includes('/template/')) {
       navigate(-1);
    } else {
       navigate('/');
    }
  };

  const handleAuthAction = async (action: () => Promise<any>) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await action();
      // Only set user if the action specifically returns it (like login/signup)
      if (result && 'id' in result) {
         setUser(result);
      }
      setShowAuthModal(false);
    } catch (error: any) {
      console.error("Auth Error:", error);
      setAuthError(error.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  if (isGlobalLoading) {
     // Optional: Render a loading screen here if you want to block the UI
     // return <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0a] text-white">Loading...</div>;
  }

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col bg-[#0a0a0a] text-[#f5f5f5] font-sans overflow-hidden">
      
      <div className="shrink-0 z-50">
        <Header
          activeNav={activeNav}
          onNavClick={handleNavClick}
          user={user}
          onSignIn={() => setShowAuthModal(true)}
          onLogout={async () => { 
            await authService.logout(); 
            // Local state update handles via listener, but we can force it for UI snapiness
            setUser(null); 
          }}
          onUpgrade={() => user ? setShowPaymentModal(true) : setShowAuthModal(true)}
          isLoading={isGlobalLoading}
          isSecondaryPage={location.pathname !== '/'}
          onBack={handleBack}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />
      </div>

      {/* Modals */}
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
             // Refresh user profile to get new credits
             const u = await authService.getCurrentUser();
             if (u) setUser(u);
          }}
        />
      )}
      
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
                onLoginRequired={() => setShowAuthModal(true)} 
                onBack={handleBack} 
              />
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <div className="shrink-0 z-50">
        <BottomNav
          activeNav={activeNav}
          onNavClick={handleNavClick}
          user={user}
          onSignIn={() => setShowAuthModal(true)}
          onLogout={async () => { await authService.logout(); }}
        />
      </div>
    </div>
  );
};

export default App;