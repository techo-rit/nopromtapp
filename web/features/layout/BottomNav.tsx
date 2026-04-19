import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface BottomNavProps {
    cartCount?: number;
    onCartClick?: () => void;
    user?: { name?: string; avatarUrl?: string } | null;
}

const tabs = [
    { id: 'home', label: 'Home', path: '/' },
    { id: 'closet', label: 'Closet', path: '/closet' },
    { id: 'room', label: 'Room', path: '/changing-room' },
    { id: 'bag', label: 'Bag', path: null },
    { id: 'profile', label: 'Profile', path: '/profile' },
] as const;

/* SF Symbols-style icons — outlined (inactive) and filled (active) */
const icons: Record<string, { outline: React.ReactNode; filled: React.ReactNode }> = {
    home: {
        outline: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
        ),
        filled: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2h-4v-7a1 1 0 00-1-1h-4a1 1 0 00-1 1v7H5a2 2 0 01-2-2z" />
            </svg>
        ),
    },
    closet: {
        outline: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L8 6h8l-4-4z" />
                <path d="M4 6h16v2H4z" />
                <path d="M6 8v2" />
                <path d="M18 8v2" />
                <path d="M8 10c0 2 1.5 3 4 3s4-1 4-3" />
                <path d="M9 13l-1 9" />
                <path d="M15 13l1 9" />
            </svg>
        ),
        filled: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 2L8 6h8l-4-4z" />
                <rect x="4" y="6" width="16" height="2" rx="0.5" />
                <path d="M6 8v2c0 0 0 0.5 0.5 0.5h1c.5 0 .5-.5.5-.5V8H6zM16 8v2c0 0 0 0.5.5.5h1c.5 0 .5-.5.5-.5V8h-2z" />
                <path d="M8 10c0 2.5 1.5 3.5 4 3.5s4-1 4-3.5l1 12H7l1-12z" />
            </svg>
        ),
    },
    room: {
        outline: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="12" cy="10" r="3" />
                <path d="M6 21v-1a6 6 0 0112 0v1" />
            </svg>
        ),
        filled: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="12" cy="10" r="3" fill="#000" />
                <path d="M6 21v-1a6 6 0 0112 0v1z" fill="#000" />
            </svg>
        ),
    },
    bag: {
        outline: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
            </svg>
        ),
        filled: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18M16 10a4 4 0 01-8 0" fill="currentColor" />
                <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M16 10a4 4 0 01-8 0" stroke="#000" strokeWidth="1.5" fill="none" />
            </svg>
        ),
    },
    profile: {
        outline: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        ),
        filled: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <circle cx="12" cy="7" r="4" />
                <path d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2H4z" />
            </svg>
        ),
    },
};

export const BottomNav: React.FC<BottomNavProps> = ({
    cartCount = 0,
    onCartClick,
    user,
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (tab: typeof tabs[number]) => {
        if (tab.id === 'home') return location.pathname === '/';
        if (tab.id === 'closet') return location.pathname === '/closet';
        if (tab.id === 'room') return location.pathname === '/changing-room';
        if (tab.id === 'bag') return cartCount > 0;
        if (tab.id === 'profile') return location.pathname === '/profile';
        return false;
    };

    const handleTap = (tab: typeof tabs[number]) => {
        if (tab.id === 'bag') {
            onCartClick?.();
        } else if (tab.path) {
            navigate(tab.path);
        }
    };

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 glass"
            style={{
                paddingBottom: "env(safe-area-inset-bottom)",
                zIndex: 'var(--z-nav)' as unknown as number,
            }}
        >
            <div className="flex items-center justify-around h-[60px]">
                {tabs.map((tab) => {
                    const active = isActive(tab);
                    const icon = icons[tab.id];
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTap(tab)}
                            className="relative flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] active:scale-95 transition-transform duration-200 cursor-pointer"
                            style={{ transitionTimingFunction: 'var(--ease-spring)' }}
                        >
                            <span style={{ color: active ? 'var(--color-gold)' : 'var(--color-tertiary)' }}>
                                {active ? icon.filled : icon.outline}
                            </span>

                            <span
                                className="text-[10px] font-medium tracking-wide"
                                style={{ color: active ? 'var(--color-gold)' : 'var(--color-tertiary)' }}
                            >
                                {tab.label}
                            </span>

                            {/* Cart badge */}
                            {tab.id === 'bag' && cartCount > 0 && (
                                <span className="absolute top-0.5 right-2.5 min-w-[16px] h-4 bg-gold text-base text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                                    {cartCount > 9 ? '9+' : cartCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
