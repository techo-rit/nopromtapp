import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

interface FloatingSearchProps {
    searchQuery: string;
    onSearchChange: (q: string) => void;
}

export const FloatingSearch: React.FC<FloatingSearchProps> = ({ searchQuery, onSearchChange }) => {
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    if (location.pathname !== '/') return null;

    // Listen to scroll on the home feed container
    useEffect(() => {
        const scrollEl = document.querySelector('[data-home-scroll="true"]');
        if (!scrollEl) return;

        let lastY = 0;
        const onScroll = () => {
            const y = scrollEl.scrollTop;
            setCollapsed(y > 120);
            lastY = y;
        };

        scrollEl.addEventListener('scroll', onScroll, { passive: true });
        return () => scrollEl.removeEventListener('scroll', onScroll);
    }, []);

    const handleExpand = () => {
        setExpanded(true);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const handleCollapse = () => {
        setExpanded(false);
        if (!searchQuery) setCollapsed(true);
    };

    // When expanded or not collapsed, show overlay search bar
    const showBar = expanded || !collapsed;

    return (
        <div
            className="md:hidden fixed z-40 flex justify-center"
            style={{ bottom: `calc(60px + env(safe-area-inset-bottom) + 10px)`, left: 0, right: 0, pointerEvents: 'none' }}
        >
            {showBar ? (
                /* ── Expanded: full search bar ── */
                <div
                    className="mx-4 flex items-center gap-2.5 h-[48px] px-4 rounded-[var(--radius-pill)] border border-gold/30 w-full max-w-md"
                    style={{
                        background: 'rgba(28,28,30,0.85)',
                        backdropFilter: 'blur(16px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 12px rgba(232,195,125,0.1)',
                        pointerEvents: 'auto',
                        transition: 'all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onFocus={() => setExpanded(true)}
                        onBlur={handleCollapse}
                        placeholder="Search styles..."
                        className="flex-1 bg-transparent text-[14px] text-primary placeholder:text-tertiary outline-none"
                    />
                    {searchQuery && (
                        <button
                            onMouseDown={(e) => { e.preventDefault(); onSearchChange(''); }}
                            className="p-1 text-tertiary hover:text-primary"
                            aria-label="Clear"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            ) : (
                /* ── Collapsed: magnifier icon button ── */
                <button
                    onClick={handleExpand}
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
                    aria-label="Search"
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
