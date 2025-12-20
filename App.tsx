import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
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
import { ArrowLeftIcon } from "./components/Icons";

type Page = "home" | "stack" | "template";
type NavCategory = "Try on" | "Creators";

// STORAGE KEYS
const STORAGE_KEY_PAGE = "nopromt_page";
const STORAGE_KEY_STACK = "nopromt_stack_id";
const STORAGE_KEY_TEMPLATE = "nopromt_template_id";
const STORAGE_KEY_NAV = "nopromt_nav";

const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

const safeRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {}
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const saved = safeGetItem(STORAGE_KEY_PAGE);
    return saved === "home" || saved === "stack" || saved === "template"
      ? saved
      : "home";
  });

  const [activeNav, setActiveNav] = useState<NavCategory>(() => {
    const saved = safeGetItem(STORAGE_KEY_NAV);
    return saved === "Try on" || saved === "Creators" ? saved : "Creators";
  });

  const [selectedStack, setSelectedStack] = useState<Stack | null>(() => {
    const savedId = safeGetItem(STORAGE_KEY_STACK);
    return savedId ? STACKS.find((s) => s.id === savedId) || null : null;
  });

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    () => {
      const savedId = safeGetItem(STORAGE_KEY_TEMPLATE);
      return savedId ? TEMPLATES.find((t) => t.id === savedId) || null : null;
    },
  );

  const [user, setUser] = useState<User | null>(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const trendingTemplates = useMemo(
    () =>
      TRENDING_TEMPLATE_IDS.map((id) =>
        TEMPLATES.find((t) => t.id === id),
      ).filter((t): t is Template => !!t),
    [],
  );

  

  useEffect(() => {
    safeSetItem(STORAGE_KEY_PAGE, currentPage);
    safeSetItem(STORAGE_KEY_NAV, activeNav);

    if (selectedStack) {
      safeSetItem(STORAGE_KEY_STACK, selectedStack.id);
    } else {
      safeRemoveItem(STORAGE_KEY_STACK);
    }

    if (selectedTemplate) {
      safeSetItem(STORAGE_KEY_TEMPLATE, selectedTemplate.id);
    } else {
      safeRemoveItem(STORAGE_KEY_TEMPLATE);
    }
  }, [currentPage, activeNav, selectedStack, selectedTemplate]);

  // In App.tsx

  useEffect(() => {
    let isActive = true;

    const initializeAuth = async () => {
      try {
        // Step 1: Check stored session FIRST
        const existingUser = await authService.getCurrentUser();
        if (isActive) {
          setUser(existingUser);
        }
      } catch (error) {
        console.warn("Failed to restore session:", error);
        if (isActive) {
          setUser(null);
        }
      }
    };

    // Start checking immediately
    initializeAuth();

    // Also listen for future changes
    const subscription = authService.onAuthStateChange((user) => {
      if (isActive) {
        setUser(user);
      }
    });

    // Stop loading immediately
    setIsGlobalLoading(false);

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

 

  const handleSelectStack = useCallback((stack: Stack) => {
    setSelectedStack(stack);
    setCurrentPage("stack");
  }, []);

  const handleSelectTemplate = useCallback((template: Template) => {
    const stackForTemplate = STACKS.find((s) => s.id === template.stackId);
    if (stackForTemplate) {
      setSelectedStack(stackForTemplate);
      setSelectedTemplate(template);
      setCurrentPage("template");
    } else {
      console.error(
        `Could not find stack with id ${template.stackId} for template ${template.name}`,
      );
    }
  }, []);

  const handleBack = useCallback(() => {
    if (currentPage === "template") {
      if (activeNav === "Try on") {
        setCurrentPage("home");
        setSelectedStack(null);
        setSelectedTemplate(null);
      } else {
        setCurrentPage("stack");
        setSelectedTemplate(null);
      }
    } else if (currentPage === "stack") {
      setCurrentPage("home");
      setSelectedStack(null);
    }
  }, [currentPage, activeNav]);

  const handleNavClick = useCallback((category: NavCategory) => {
    setActiveNav(category);
    setCurrentPage("home");
    setSelectedStack(null);
    setSelectedTemplate(null);
  }, []);

  const handleLoginRequired = useCallback(() => {
    if (!user) {
      setShowAuthModal(true);
    }
  }, [user]);

  const handleSignUp = async (
    email: string,
    password: string,
    name: string,
  ) => {
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
      setAuthError(
        error instanceof Error ? error.message : "Google sign in failed",
      );
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  const renderContent = () => {
    switch (currentPage) {
      case "template":
        return (
          selectedTemplate &&
          selectedStack && (
            <TemplateExecution
              template={selectedTemplate}
              stack={selectedStack}
              onBack={handleBack}
              onLoginRequired={handleLoginRequired}
              user={user}
            />
          )
        );
        case "stack":
          return (
            selectedStack && (
              // No padding, fixed screen height ensures the Grid controls the scroll
              <div className="w-full h-screen overflow-hidden bg-[#0a0a0a]">
                <TemplateGrid
                  templates={TEMPLATES.filter((t) => t.stackId === selectedStack.id)}
                  onSelectTemplate={handleSelectTemplate}
                />
              </div>
            )
          );
      case "home":
      default:
        if (activeNav === "Try on") {
          const fititTemplates = TEMPLATES.filter((t) => t.stackId === "fitit");
          return (
            <div className="w-full max-w-[1440px] mx-auto px-8 py-12">
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

        const pageTitle = "Choose your form";

        return (
          <>
            <div>
              <TrendingCarousel
                templates={trendingTemplates}
                onSelectTemplate={handleSelectTemplate}
              />
            </div>
            <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 pt-8 pb-6 md:py-8">
              {/* Heading restored here */}
              <h2 className="text-[28px] md:text-[40px] lg:text-[48px] font-semibold tracking-[0.005em] md:tracking-[-0.01em] lg:tracking-[-0.02em] leading-[1.2] md:leading-[1.1] lg:leading-[1.08] text-[#f5f5f5] mb-8 md:mb-10 lg:mb-12 pt-4 md:pt-6 lg:pt-8 border-t border-[#2a2a2a] text-left">
                {pageTitle}
              </h2>

              <StackGrid
                stacks={stacksToShow}
                onSelectStack={handleSelectStack}
              />
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans selection:bg-[#c9a962] selection:text-[#0a0a0a]">
      <Header
        activeNav={activeNav}
        onNavClick={handleNavClick}
        user={user}
        onSignIn={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        isLoading={isGlobalLoading}
        isSecondaryPage={currentPage !== "home"}
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
      <main className="pb-[80px] md:pb-0">{renderContent()}</main>
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