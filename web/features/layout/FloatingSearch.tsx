import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

interface FloatingSearchProps {
    searchQuery: string;
    onSearchChange: (q: string) => void;
}

export const FloatingSearch: React.FC<FloatingSearchProps> = ({ searchQuery, onSearchChange }) => {
    const location = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (location.pathname !== '/') {
            setIsScrolled(false);
            return;
        }
        const el = document.querySelector('[data-home-scroll="true"]') as HTMLElement | null;
        if (!el) return;
        const onScroll = () => setIsScrolled(el.scrollTop > 48);
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [location.pathname]);

    // Reset when leaving home
    useEffect(() => {
        if (location.pathname !== '/') setIsScrolled(false);
    }, [location.pathname]);

    if (location.pathname !== '/') return null;

    const collapsed = isScrolled && !isFocused && !searchQuery;

    const handleIconClick = () => {
        setIsScrolled(false);
        // Scroll the home page back to top briefly so the pill re-appears
        const el = document.querySelector('[data-home-scroll="true"]') as HTMLElement | null;
        if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => inputRef.current?.focus(), 180);
    };

    return (
        <div
            className="md:hidden fixed z-40 flex justify-center"
            style={{ bottom: `calc(60px + env(safe-area-inset-bottom) + 10px)`, left: 0, right: 0, pointerEvents: 'none' }}
        >
            {collapsed ? (
                <button
                    onClick={handleIconClick}
                    className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90"
                    style={{
                        background: 'rgba(20,20,20,0.92)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                        pointerEvents: 'auto',
                        transition: 'transform 100ms ease',
                    }}
                    aria-label="Search"
                >
                    <SearchIcon />
                </button>
            ) : (
                <div
                    className="flex items-center gap-2.5 transition-all duration-300"
                    style={{
                        width: 'calc(100% - 32px)',
                        height: 48,
                        borderRadius: 999,
                        background: 'rgba(18,18,18,0.94)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: isFocused ? '1px solid rgba(212,184,114,0.45)' : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
                        padding: '0 16px',
                        pointerEvents: 'auto',
                        transition: 'border 200ms ease',
                    }}
                >
                    <SearchIcon dimmed={!isFocused && !searchQuery} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="desire for..."
                        className="flex-1 bg-transparent text-[14px] text-[#f0f0f0] placeholder-[#E4C085]/45 italic focus:outline-none"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                    {searchQuery && (
                        <button
                            onMouseDown={(e) => { e.preventDefault(); onSearchChange(''); }}
                            className="flex items-center justify-center w-5 h-5 rounded-full text-[#888] hover:text-[#bbb] transition-colors"
                            aria-label="Clear search"
                        >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const SearchIcon: React.FC<{ dimmed?: boolean }> = ({ dimmed }) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
        <circle cx="11" cy="11" r="8" stroke={dimmed ? '#555' : '#888'} strokeWidth="2" />
        <path d="M21 21l-4.35-4.35" stroke={dimmed ? '#555' : '#888'} strokeWidth="2" strokeLinecap="round" />
    </svg>
);
