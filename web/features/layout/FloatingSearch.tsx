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
                /* ── Bar: "Manifesting desire for..." search row ── */
                <button
                    onClick={goToSearch}
                    className="mx-4 flex items-center gap-3 h-[44px] px-5 rounded-full border border-[#2a2a2a] w-full max-w-md text-left active:scale-[0.98]"
                    style={{
                        background: '#0a0a0a',
                        pointerEvents: 'auto',
                        transition: 'transform 100ms ease',
                    }}
                    aria-label="Open search"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <circle cx="11" cy="11" r="8" stroke="#c9a962" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="#c9a962" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span className="flex-1 text-[14px] text-[#a0a0a0]">Search styles...</span>
                </button>
            ) : (
                /* ── Collapsed: gold accent pill ── */
                <button
                    onClick={goToSearch}
                    className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90"
                    style={{
                        background: '#141414',
                        border: '1px solid #2a2a2a',
                        pointerEvents: 'auto',
                        transition: 'transform 100ms ease',
                    }}
                    aria-label="Open search"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                </button>
            )}
        </div>
    );
};
