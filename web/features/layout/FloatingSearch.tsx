import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface FloatingSearchProps {
    searchQuery: string;
    onSearchChange: (q: string) => void;
}

export const FloatingSearch: React.FC<FloatingSearchProps> = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);

    const isHome = location.pathname === '/';

    // Collapse the bar after scrolling down, restore at top
    useEffect(() => {
        if (!isHome) return;
        const scrollEl = document.querySelector('[data-home-scroll="true"]');
        if (!scrollEl) return;

        const onScroll = () => setCollapsed(scrollEl.scrollTop > 120);
        scrollEl.addEventListener('scroll', onScroll, { passive: true });
        return () => scrollEl.removeEventListener('scroll', onScroll);
    }, [isHome]);

    if (!isHome) return null;

    const goToSearch = () => navigate('/search');

    return (
        <div
            className="md:hidden fixed z-40 flex justify-center"
            style={{ bottom: `calc(60px + env(safe-area-inset-bottom) + 10px)`, left: 0, right: 0, pointerEvents: 'none' }}
        >
            {!collapsed ? (
                /* ── Bar: tappable search row ── */
                <button
                    onClick={goToSearch}
                    className="mx-4 flex items-center gap-2.5 h-[48px] px-4 rounded-[var(--radius-pill)] border border-gold/30 w-full max-w-md text-left active:scale-[0.98]"
                    style={{
                        background: 'rgba(28,28,30,0.85)',
                        backdropFilter: 'blur(16px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 12px rgba(232,195,125,0.1)',
                        pointerEvents: 'auto',
                        transition: 'transform 100ms ease',
                    }}
                    aria-label="Open search"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <span className="flex-1 text-[14px] text-tertiary">Search styles...</span>
                </button>
            ) : (
                /* ── Collapsed: magnifier pill ── */
                <button
                    onClick={goToSearch}
                    className="w-12 h-12 rounded-full flex items-center justify-center active:scale-90"
                    style={{
                        background: 'rgba(28,28,30,0.85)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid rgba(232,195,125,0.3)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 12px rgba(232,195,125,0.15)',
                        pointerEvents: 'auto',
                        transition: 'transform 100ms ease',
                    }}
                    aria-label="Open search"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                </button>
            )}
        </div>
    );
};
