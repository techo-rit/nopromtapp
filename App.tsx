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
import type { Stack, Template, User } from "./types";
import { STACKS, TEMPLATES, TRENDING_TEMPLATE_IDS } from "./constants";

// --- Route Components (Wrappers to handle URL parameters) ---

// 1. Home Page Component
const HomeRoute = ({ 
  activeNav, 
  handleSelectStack, 
  handleSelectTemplate, 
  trendingTemplates 
}: any) => {
  if (activeNav === "Try on") {
    const fititTemplates = TEMPLATES.filter((t) => t.stackId === "fitit");
    return (
      // FIX: Removed px-8 py-12. This aligns the grid upwards on Desktop.
      <div className="w-full max-w-[1440px] mx-auto">
        <TemplateGrid
          templates={fititTemplates}
          onSelectTemplate={handleSelectTemplate}
        />
      </div>
    );
  }

  const creatorsStackIds = [
    "flex",
    "aesthetics",
    "sceneries",
    "clothes",
    "monuments",
    "celebration",
    "fitit",
    "animation",
  ];
  const stacksToShow = creatorsStackIds
    .map((id) => STACKS.find((s) => s.id === id))
    .filter((s): s is Stack => !!s);

  return (
    <>
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
    </>
  );
};

// 2. Stack Page Component (Reads ID from URL)
const StackRoute = ({ onSelectTemplate }: { onSelectTemplate: (t: Template) => void }) => {
  const { stackId } = useParams();
  const selectedStack = STACKS.find((s) => s.id === stackId);

  if (!selectedStack) return <Navigate to="/" replace />;

  return (
    <div className="w-full h-screen overflow-hidden bg-[#0a0a0a]">
      <TemplateGrid
        templates={TEMPLATES.filter((t) => t.stackId === selectedStack.id)}
        onSelectTemplate={onSelectTemplate}
      />
    </div>
  );
};

// 3. Template Execution Component (Reads ID from URL)
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

// --- Main App Component ---

type NavCategory = "Try on" | "Creators";
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
  
  // FIX: Start loading, but we will force it off shortly
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const trendingTemplates = useMemo(
    () => TRENDING_TEMPLATE_IDS.map((id) => TEMPLATES.find((t) => t.id === id)).filter((t): t is Template => !!t),
    [],
  );

  useEffect(() => {
    safeSetItem(STORAGE_KEY_NAV, activeNav);
  }, [activeNav]);

  // --- AUTHENTICATION FIX: PERSISTENT LOGIN ACROSS REFRESH/CLOSE/MULTI-DEVICE ---
  useEffect(() => {
    let mounted = true;
    let subscription: any = null;

    const initializeAuth = async () => {
      try {
        // CRITICAL: First, handle OAuth redirects from URL params
        // Supabase automatically detects and processes OAuth sessions from URL
        // (detectSessionInUrl: true in supabase.ts client config)
        
        // Small delay to allow OAuth redirect processing
        await new Promise(resolve => setTimeout(resolve, 500));

        if (!mounted) return;

        // CRITICAL: Recover session from localStorage/cache
        // This immediately restores user session on page refresh or browser reopening
        const existingUser = await authService.getCurrentUser();
        
        if (mounted) {
          setUser(existingUser);
          console.log("Session recovered:", existingUser?.id ? "User logged in" : "No session found");
        }

        // Stop loading after initial session check
        if (mounted) {
          setIsGlobalLoading(false);
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        if (mounted) {
          setUser(null);
          setIsGlobalLoading(false);
        }
      }
    };

    // CRITICAL: Set up realtime auth listener
    // This detects:
    // - Sign in/out events
    // - Token refresh (keeps session alive)
    // - Multi-device changes (when logged in on another device)
    subscription = authService.onAuthStateChange((updatedUser) => {
      if (mounted) {
        console.log("Auth state changed:", updatedUser?.id ? "User logged in" : "User logged out");
        setUser(updatedUser);
        setIsGlobalLoading(false);
      }
    });

    // Initialize auth immediately
    initializeAuth();

    // Safety timeout: If auth check hangs, force app to load anyway after 5 seconds
    const safetyTimeout = setTimeout(() => {
      if (mounted && isGlobalLoading) {
        console.warn("Auth initialization timeout - forcing app load");
        setIsGlobalLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []); // Run once on mount
  // --- AUTHENTICATION FIX END ---

  // Navigation Handlers using React Router
  const handleSelectStack = useCallback((stack: Stack) => {
    navigate(`/stack/${stack.id}`);
  }, [navigate]);

  const handleSelectTemplate = useCallback((template: Template) => {
    navigate(`/template/${template.id}`);
  }, [navigate]);

  const handleBack = useCallback(() => {
    if (location.pathname.includes('/template/')) {
       navigate(-1); 
    } else if (location.pathname.includes('/stack/')) {
       navigate('/');
    } else {
      navigate('/');
    }
  }, [location, navigate]);

  const handleNavClick = useCallback((category: NavCategory) => {
    setActiveNav(category);
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans selection:bg-[#c9a962] selection:text-[#0a0a0a]">
      <Header
        activeNav={activeNav}
        onNavClick={handleNavClick}
        user={user}
        onSignIn={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        isLoading={isGlobalLoading}
        isSecondaryPage={isSecondaryPage}
        onBack={handleBack}
      />
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
      
      <main className="pb-[80px] md:pb-0">
        <Routes>
          <Route 
            path="/" 
            element={
              <HomeRoute 
                activeNav={activeNav}
                handleSelectStack={handleSelectStack}
                handleSelectTemplate={handleSelectTemplate}
                trendingTemplates={trendingTemplates}
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

      <BottomNav
        activeNav={activeNav}
        onNavClick={handleNavClick}
        user={user}
        onSignIn={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default App;