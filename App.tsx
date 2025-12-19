import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AuthModal } from './components/AuthModal';
import { TrendingCarousel } from './components/TrendingCarousel';
import { StackGrid } from './components/StackGrid';
import { TemplateGrid } from './components/TemplateGrid';
import { TemplateExecution } from './components/TemplateExecution';
import { authService } from './services/authService';
import type { Stack, Template, User } from './types';
import { STACKS, TEMPLATES, TRENDING_TEMPLATE_IDS } from './constants';
import { ArrowLeftIcon } from './components/Icons';

type Page = 'home' | 'stack' | 'template';
type NavCategory = 'Try on' | 'Creators';

// STORAGE KEYS
const STORAGE_KEY_PAGE = 'nopromt_page';
const STORAGE_KEY_STACK = 'nopromt_stack_id';
const STORAGE_KEY_TEMPLATE = 'nopromt_template_id';
const STORAGE_KEY_NAV = 'nopromt_nav';

const App: React.FC = () => {
  // 1. Initialize State
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    return (localStorage.getItem(STORAGE_KEY_PAGE) as Page) || 'home';
  });

  const [activeNav, setActiveNav] = useState<NavCategory>(() => {
    return (localStorage.getItem(STORAGE_KEY_NAV) as NavCategory) || 'Creators';
  });

  const [selectedStack, setSelectedStack] = useState<Stack | null>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY_STACK);
    return savedId ? STACKS.find(s => s.id === savedId) || null : null;
  });

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY_TEMPLATE);
    return savedId ? TEMPLATES.find(t => t.id === savedId) || null : null;
  });
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const trendingTemplates = TRENDING_TEMPLATE_IDS.map(id => TEMPLATES.find(t => t.id === id)).filter((t): t is Template => !!t);

  // Refs for mobile scroll snap between sections
  const trendingSectionRef = useRef<HTMLDivElement>(null);
  const firstStackCardRef = useRef<HTMLDivElement>(null);
  const hasSnappedRef = useRef(false);

  // 2. Save State to Memory
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PAGE, currentPage);
    localStorage.setItem(STORAGE_KEY_NAV, activeNav);
    
    if (selectedStack) {
      localStorage.setItem(STORAGE_KEY_STACK, selectedStack.id);
    } else {
      localStorage.removeItem(STORAGE_KEY_STACK);
    }

    if (selectedTemplate) {
      localStorage.setItem(STORAGE_KEY_TEMPLATE, selectedTemplate.id);
    } else {
      localStorage.removeItem(STORAGE_KEY_TEMPLATE);
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
      console.warn('Failed to restore session:', error);
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

  // MOBILE-ONLY: Guided scroll snap from Trending to Creator Stacks
  // Uses IntersectionObserver to detect when Trending section leaves viewport
  useEffect(() => {
    // Only run on mobile (max-width: 768px)
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    const trendingEl = trendingSectionRef.current;
    const firstCardEl = firstStackCardRef.current;
    
    if (!trendingEl || !firstCardEl) return;

    // Reset snap flag when page changesThere is a problem in the home screen, creator screen. There is a double scrolling happening in the mobile screen. I don't want double scrolling. It is irritating. Try to fix it with a replaceable system without removing the existing features. 
    hasSnappedRef.current = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        
        // Trigger when trending section is leaving viewport (ratio drops below threshold)
        // and user is scrolling down (boundingClientRect.top is negative)
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0 && !hasSnappedRef.current) {
          // SCROLL SNAP TRIGGERED HERE
          hasSnappedRef.current = true;
          console.log('[ScrollSnap] Snap triggered! Scrolling to first stack card.');
          
          // Mobile header offset
          const headerOffset = 56;
          const elementTop = firstCardEl.getBoundingClientRect().top + window.scrollY;
          
          window.scrollTo({
            top: elementTop - headerOffset - 16, // 16px extra padding
            behavior: 'smooth'
          });
        }
      },
      {
        root: null, // viewport
        threshold: 0.15, // trigger when 15% visible
        rootMargin: '0px'
      }
    );

    observer.observe(trendingEl);

    // Reset snap flag when scrolling back to top
    const handleScrollReset = () => {
      if (window.scrollY < 100) {
        hasSnappedRef.current = false;
      }
    };

    window.addEventListener('scroll', handleScrollReset, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScrollReset);
    };
  }, [currentPage]);

  
  const handleSelectStack = useCallback((stack: Stack) => {
    setSelectedStack(stack);
    setCurrentPage('stack');
  }, []);

  const handleSelectTemplate = useCallback((template: Template) => {
    const stackForTemplate = STACKS.find(s => s.id === template.stackId);
    if (stackForTemplate) {
        setSelectedStack(stackForTemplate);
        setSelectedTemplate(template);
        setCurrentPage('template');
    } else {
        console.error(`Could not find stack with id ${template.stackId} for template ${template.name}`);
    }
  }, []);
  
  const handleBack = useCallback(() => {
    if (currentPage === 'template') {
      if (activeNav === 'Try on') {
        setCurrentPage('home');
        setSelectedStack(null);
        setSelectedTemplate(null);
      } else {
        setCurrentPage('stack');
        setSelectedTemplate(null);
      }
    } else if (currentPage === 'stack') {
      setCurrentPage('home');
      setSelectedStack(null);
    }
  }, [currentPage, activeNav]);
  
  const handleNavClick = useCallback((category: NavCategory) => {
    setActiveNav(category);
    setCurrentPage('home');
    setSelectedStack(null);
    setSelectedTemplate(null);
  }, []);

  const handleLoginRequired = useCallback(() => {
    if (!user) {
      setShowAuthModal(true);
    }
  }, [user]);

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
      setAuthError(error instanceof Error ? error.message : 'Sign up failed');
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
      setAuthError(error instanceof Error ? error.message : 'Login failed');
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
      setAuthError(error instanceof Error ? error.message : 'Google sign in failed');
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'template':
        return selectedTemplate && selectedStack && (
          <TemplateExecution
            template={selectedTemplate}
            stack={selectedStack}
            onBack={handleBack}
            onLoginRequired={handleLoginRequired}
            user={user}
          />
        );
      case 'stack':
        return selectedStack && (
          <div className="w-full max-w-[1440px] mx-auto px-8 py-12">
            <button
              onClick={handleBack}
              aria-label="Go back to all stacks"
              className="flex items-center gap-2 text-[#c9a962] hover:text-[#d4b872] mb-8 transition-colors rounded-md focus:outline-none font-medium text-lg"
            >
              <ArrowLeftIcon />
              Back to Stacks
            </button>
            <h1 className="text-[44px] md:text-[64px] lg:text-[80px] font-bold md:font-semibold tracking-[-0.02em] lg:tracking-[-0.03em] text-[#f5f5f5] mb-4 leading-[1.1] md:leading-[1.05]">{selectedStack.name}</h1>
            <p className="text-[#a0a0a0] text-[17px] md:text-[19px] lg:text-[21px] font-medium mb-12 leading-[1.4] lg:leading-[1.33] tracking-normal md:tracking-[0.01em] lg:tracking-[0.015em] max-w-2xl">Choose a template to start remixing your image.</p>
            <TemplateGrid
              templates={TEMPLATES.filter(t => t.stackId === selectedStack.id)}
              onSelectTemplate={handleSelectTemplate}
            />
          </div>
        );
      case 'home':
      default:
        if (activeNav === 'Try on') {
          const fititTemplates = TEMPLATES.filter(t => t.stackId === 'fitit');
          return (
            <div className="w-full max-w-[1440px] mx-auto px-8 py-12">
              <TemplateGrid 
                templates={fititTemplates} 
                onSelectTemplate={handleSelectTemplate}
              />
            </div>
          );
        }
        
        const creatorsStackIds = ['flex', 'aesthetics', 'sceneries', 'clothes', 'monuments', 'celebration', 'fitit', 'animation'];
        const stacksToShow = creatorsStackIds
          .map(id => STACKS.find(s => s.id === id))
          .filter((s): s is Stack => !!s);
          
        const pageTitle = 'Choose your form';

        return (
          <>
            <div ref={trendingSectionRef}>
              <TrendingCarousel templates={trendingTemplates} onSelectTemplate={handleSelectTemplate} />
            </div>
            <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 pt-8 pb-6 md:py-8">
              <h2 className="text-[28px] md:text-[40px] lg:text-[48px] font-semibold tracking-[0.005em] md:tracking-[-0.01em] lg:tracking-[-0.02em] leading-[1.2] md:leading-[1.1] lg:leading-[1.08] text-[#f5f5f5] mb-8 md:mb-10 lg:mb-12 pt-4 md:pt-6 lg:pt-8 border-t border-[#2a2a2a] text-left">{pageTitle}</h2>
              <StackGrid 
                stacks={stacksToShow} 
                onSelectStack={handleSelectStack}
                firstCardRef={firstStackCardRef}
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
        {renderContent()}
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