import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from "react-router-dom";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { AuthModal } from "./components/AuthModal";
import { TrendingCarousel } from "./components/TrendingCarousel";
import { StackGrid } from "./components/StackGrid";
import { TemplateGrid } from "./components/TemplateGrid";
import { TemplateExecution } from "./components/TemplateExecution";
import { authService } from "./services/authService";
import { searchTemplates } from "./utils/searchLogic";
import type { Stack, Template, User, NavCategory } from "./types";
import { STACKS, TEMPLATES, TRENDING_TEMPLATE_IDS } from "./constants";


// --- Main App Component ---

const HomeRoute = ({ 
  activeNav, 
  handleSelectStack, 
  handleSelectTemplate, 
  trendingTemplates,
  searchQuery,
  searchResults
}: any) => {

  // 1. SEARCH STATE ACTIVE: Show Results Grid
  if (searchQuery.length > 0) {
      return (
          // FIX: Full height container for the grid
          <div className="w-full h-full bg-[#0a0a0a]">
              {searchResults.length > 0 ? (
                  <TemplateGrid
                      templates={searchResults}
                      onSelectTemplate={handleSelectTemplate}
                  />
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-[#6b6b6b] px-4">
                      <p>No templates found.</p>
                      <p className="text-sm mt-2">Try searching for "wedding", "office", or "party".</p>
                  </div>
              )}
          </div>
      );
  }

  // 2. NORMAL FLOW ("Try on")
  if (activeNav === "Try on") {
    const fititTemplates = TEMPLATES.filter((t) => t.stackId === "fitit");
    return (
      <div className="w-full h-full bg-[#0a0a0a]">
        <TemplateGrid
          templates={fititTemplates}
          onSelectTemplate={handleSelectTemplate}
        />
      </div>
    );
  }

  // 3. NORMAL FLOW ("Creators" / Home)
  const creatorsStackIds = [
    "flex", "aesthetics", "sceneries", "clothes", "monuments", "celebration", "fitit", "animation",
  ];
  const stacksToShow = creatorsStackIds
    .map((id) => STACKS.find((s) => s.id === id))
    .filter((s): s is Stack => !!s);

  return (
    // FIX: This section needs its own scroll container because it's content-heavy
    // pb-24 ensures the last item isn't hidden behind the BottomNav visuals
    <div className="w-full h-full overflow-y-auto scrollbar-hide pb-24 bg-[#0a0a0a]">
      <div>
        <TrendingCarousel
          templates={trendingTemplates}
          onSelectTemplate={handleSelectTemplate}
        />
      </div>
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 pt-8 pb-6 md:py-8">
        <h2 className="text-[28px] md:text-[40px] lg:text-[48px] font-semibold tracking-[0.005em] md:tracking-[-0.01em] lg:tracking-[-0.02em] leading-[1.2] md:leading-[1.1] lg:leading-[1.08] text-[#f5f5f5] mb-8 md:mb-10 lg:mb-12 pt-4 md:pt-6 lg:pt-8 border-t border-[#2a2a2a] text-left">
          Choose your form
        </h2>
        <StackGrid
          stacks={stacksToShow}
          onSelectStack={handleSelectStack}
        />
      </div>
    </div>
  );
};

const StackRoute = ({ onSelectTemplate }: { onSelectTemplate: (t: Template) => void }) => {
  const { stackId } = useParams();
  const selectedStack = STACKS.find((s) => s.id === stackId);
  if (!selectedStack) return <Navigate to="/" replace />;
  // FIX: h-full allows TemplateGrid to take available space
  return (
    <div className="w-full h-full overflow-hidden bg-[#0a0a0a]">
      <TemplateGrid
        templates={TEMPLATES.filter((t) => t.stackId === selectedStack.id)}
        onSelectTemplate={onSelectTemplate}
      />
    </div>
  );
};

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
  const selectedTemplate = TEMPLATES.find((t) => t.id === templateId);
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

// Storage Helpers
const STORAGE_KEY_NAV = "nopromt_nav";
const safeGetItem = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const safeSetItem = (key: string, value: string): void => {
  try { localStorage.setItem(key, value); } catch {}
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeNav, setActiveNav] = useState<NavCategory>(() => {
    const saved = safeGetItem(STORAGE_KEY_NAV);
    return saved === "Try on" || saved === "Creators" ? saved : "Creators";
  });

  const [user, setUser] = useState<User | null>(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // --- SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = useMemo(() => {
    return searchTemplates(searchQuery, TEMPLATES);
  }, [searchQuery]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.length > 0 && location.pathname !== '/') {
        navigate('/');
    }
  };

  const trendingTemplates = useMemo(
    () => TRENDING_TEMPLATE_IDS.map((id) => TEMPLATES.find((t) => t.id === id)).filter((t): t is Template => !!t),
    [],
  );

  useEffect(() => {
    safeSetItem(STORAGE_KEY_NAV, activeNav);
  }, [activeNav]);

  useEffect(() => {
    let mounted = true;
    authService.getCurrentUser().then((initialUser) => {
      if (mounted) {
        if (initialUser) setUser(initialUser);
        setIsGlobalLoading(false); 
      }
    });

    const subscription = authService.onAuthStateChange((updatedUser) => {
      if (mounted) {
        setUser(updatedUser);
        setIsGlobalLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Navigation Handlers
  const handleSelectStack = useCallback((stack: Stack) => {
    navigate(`/stack/${stack.id}`);
  }, [navigate]);

  const handleSelectTemplate = useCallback((template: Template) => {
    navigate(`/template/${template.id}`);
  }, [navigate]);

  const handleBack = useCallback(() => {
    if (searchQuery) {
        setSearchQuery("");
        return;
    }
    if (location.pathname.includes('/template/')) {
       navigate(-1); 
    } else if (location.pathname.includes('/stack/')) {
       navigate('/');
    } else {
      navigate('/');
    }
  }, [location, navigate, searchQuery]);

  const handleNavClick = useCallback((category: NavCategory) => {
    setActiveNav(category);
    setSearchQuery("");
    navigate('/');
  }, [navigate]);

  const handleLoginRequired = useCallback(() => {
    if (!user) setShowAuthModal(true);
  }, [user]);

  // Auth Handlers
  const handleSignUp = async (email: string, password: string, name: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const newUser = await authService.signUp(email, password, name);
      if (newUser) {
        setUser(newUser);
        setShowAuthModal(false);
      } else {
        setAuthError("Account created! Please check your email to confirm.");
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign up failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const loggedInUser = await authService.login(email, password);
      setUser(loggedInUser);
      setShowAuthModal(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Google sign in failed");
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  const isSecondaryPage = location.pathname !== '/';

  // --- APP SHELL LAYOUT ---
  // We use 100dvh (Dynamic Viewport Height) to properly handle mobile browser bars.
  // The layout is a flex column: Header (fixed height) + Main (flexible) + Footer (fixed height).
  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col bg-[#0a0a0a] text-[#f5f5f5] font-sans overflow-hidden">
      
      {/* 1. Header (Static at top) */}
      <div className="shrink-0 z-50">
        <Header
          activeNav={activeNav}
          onNavClick={handleNavClick}
          user={user}
          onSignIn={() => setShowAuthModal(true)}
          onLogout={handleLogout}
          isLoading={isGlobalLoading}
          isSecondaryPage={isSecondaryPage}
          onBack={handleBack}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setAuthError(null);
        }}
        onSignUp={handleSignUp}
        onLogin={handleLogin}
        onGoogleAuth={handleGoogleAuth}
        isLoading={authLoading}
        error={authError}
      />
      
      {/* 2. Main Content (Scrollable Area) */}
      {/* flex-1 makes it fill all remaining space. overflow-hidden prevents body scroll. */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        <Routes>
          <Route 
            path="/" 
            element={
              <HomeRoute 
                activeNav={activeNav}
                handleSelectStack={handleSelectStack}
                handleSelectTemplate={handleSelectTemplate}
                trendingTemplates={trendingTemplates}
                searchQuery={searchQuery}
                searchResults={searchResults}
              />
            } 
          />
          <Route 
            path="/stack/:stackId" 
            element={<StackRoute onSelectTemplate={handleSelectTemplate} />} 
          />
          <Route 
            path="/template/:templateId" 
            element={
              <TemplateRoute 
                user={user} 
                onLoginRequired={handleLoginRequired} 
                onBack={handleBack} 
              />
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* 3. Bottom Nav (Static at bottom) */}
      <div className="shrink-0 z-50">
        <BottomNav
          activeNav={activeNav}
          onNavClick={handleNavClick}
          user={user}
          onSignIn={() => setShowAuthModal(true)}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
};

export default App;