// src/App.tsx
import React, { useState, useEffect, useMemo } from "react";
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
  
  // INDUSTRY STANDARD: Failsafe Loading State
  // We default to true, but we GUARANTEE it becomes false eventually.
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

  // --- Auth Initialization (FAIL-SAFE) ---
  useEffect(() => {
    let mounted = true;

    // 1. FAILSAFE: Force the app to load after 1.5s no matter what.
    // This prevents the "Blank Screen" if Supabase hangs.
    const safetyTimer = setTimeout(() => {
      if (mounted && isGlobalLoading) {
        console.warn("[App] Auth check timed out - forcing guest mode");
        setIsGlobalLoading(false);
      }
    }, 1500);

    const initAuth = async () => {
      try {
        // 2. Check for existing session first (fastest)
        const currentUser = await authService.getCurrentUser();
        if (mounted && currentUser) {
          setUser(currentUser);
        }
      } catch (err) {
        console.warn("[App] Initial auth check failed:", err);
      } finally {
        // 3. ALWAYS stop loading after the check, result or not.
        if (mounted) setIsGlobalLoading(false);
      }
    };

    // 4. Start the listener for future updates (Login/Logout)
    const subscription = authService.onAuthStateChange((updatedUser) => {
      if (!mounted) return;
      console.log("[App] Auth State Changed:", updatedUser ? "User Logged In" : "User Logged Out");
      setUser(updatedUser);
      setIsGlobalLoading(false); // Ensure loading stops on event
    });

    // Start the initial check
    initAuth();

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      if (subscription?.unsubscribe) subscription.unsubscribe();
    };
  }, []); // Empty dependency array = runs once on mount

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
      // Only set user manually if the action returns it immediately
      // The listener will also catch this, but this makes the UI snappier
      if (result && 'id' in result) {
         setUser(result);
      }
      setShowAuthModal(false);
    } catch (error: any) {
      console.error("Auth Action Error:", error);
      setAuthError(error.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  // Prevent interactions while loading, but don't show a generic white screen.
  // We use a dark background to match the theme.
  if (isGlobalLoading) {
     return <div className="fixed inset-0 bg-[#0a0a0a] z-[9999]" />;
  }

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col bg-[#0a0a0a] text-[#f5f5f5] font-sans overflow-hidden">
      
      {/* HEADER */}
      <div className="shrink-0 z-50">
        <Header
          activeNav={activeNav}
          onNavClick={handleNavClick}
          user={user}
          onSignIn={() => setShowAuthModal(true)}
          onLogout={async () => { 
            await authService.logout(); 
            // We rely on the listener to clear the user, but we can optimistically clear it here
            setUser(null); 
          }}
          onUpgrade={() => user ? setShowPaymentModal(true) : setShowAuthModal(true)}
          isLoading={false} // We handled global loading above
          isSecondaryPage={location.pathname !== '/'}
          onBack={handleBack}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />
      </div>

      {/* MODALS */}
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

      {/* FOOTER */}
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