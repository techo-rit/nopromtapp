import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface BottomNavProps {
    cartCount?: number;
    onCartClick?: () => void;
    user?: { name?: string; avatarUrl?: string | null } | null;
}

/* ── Custom SVG Icons (old nopromt.ai style) ── */

const HomeIcon: React.FC<{ active: boolean }> = ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "1.5"}>
        {active ? (
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2h-4v-7a1 1 0 00-1-1h-4a1 1 0 00-1 1v7H5a2 2 0 01-2-2z" />
        ) : (
            <>
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="9,22 9,12 15,12 15,22" strokeLinecap="round" strokeLinejoin="round" />
            </>
        )}
    </svg>
);

const ClosetIcon: React.FC<{ active: boolean }> = ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L8 6h8l-4-4z" />
        <path d="M4 6h16v2H4z" />
        <path d="M8 10c0 2 1.5 3 4 3s4-1 4-3" />
        <path d="M9 13l-1 9" />
        <path d="M15 13l1 9" />
    </svg>
);

const RoomIcon: React.FC<{ active: boolean }> = ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="12" cy="10" r="3" />
        <path d="M6 21v-1a6 6 0 0112 0v1" />
    </svg>
);

const BagIcon: React.FC<{ active: boolean }> = ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        {!active && <line x1="3" y1="6" x2="21" y2="6" />}
        <path d="M16 10a4 4 0 01-8 0" fill="none" stroke={active ? "#0a0a0a" : "currentColor"} strokeWidth="1.5" />
    </svg>
);

const ProfileIcon: React.FC<{ active: boolean; avatarUrl?: string | null; name?: string }> = ({ active, avatarUrl, name }) => {
    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full object-cover"
                style={{
                    border: active ? '2px solid #c9a962' : '1.5px solid #3a3a3a',
                }}
            />
        );
    }
    if (name) {
        return (
            <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                    backgroundColor: active ? '#c9a962' : '#2a2a2a',
                    color: active ? '#0a0a0a' : '#a0a0a0',
                }}
            >
                {name.charAt(0).toUpperCase()}
            </div>
        );
    }
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
            {active ? (
                <>
                    <circle cx="12" cy="7" r="4" />
                    <path d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2H4z" />
                </>
            ) : (
                <>
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </>
            )}
        </svg>
    );
};

const tabs = [
    { id: 'home', label: 'Home', path: '/' },
    { id: 'closet', label: 'Closet', path: '/closet' },
    { id: 'room', label: 'Room', path: '/changing-room' },
    { id: 'bag', label: 'Bag', path: null },
    { id: 'profile', label: 'Profile', path: '/profile' },
] as const;

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
        if (tab.id === 'bag') return false;
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
            className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 border-t border-[#1a1a1a]"
            style={{
                paddingBottom: "env(safe-area-inset-bottom)",
                zIndex: 50,
            }}
        >
            <div className="flex items-center justify-around h-[56px]">
                {tabs.map((tab) => {
                    const active = isActive(tab);
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTap(tab)}
                            className="relative flex flex-col items-center justify-center gap-1 w-14 min-h-[44px] active:scale-90 transition-transform duration-150 cursor-pointer"
                        >
                            <span style={{ color: active ? '#c9a962' : '#555' }}>
                                {tab.id === 'home' && <HomeIcon active={active} />}
                                {tab.id === 'closet' && <ClosetIcon active={active} />}
                                {tab.id === 'room' && <RoomIcon active={active} />}
                                {tab.id === 'bag' && <BagIcon active={active} />}
                                {tab.id === 'profile' && (
                                    <ProfileIcon active={active} avatarUrl={user?.avatarUrl} name={user?.name} />
                                )}
                            </span>
                            {active && <span className="w-1 h-1 rounded-full bg-[#c9a962]" />}
                            {/* Cart badge */}
                            {tab.id === 'bag' && cartCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] bg-[#c9a962] text-[#0a0a0a] text-[9px] font-bold rounded-full flex items-center justify-center px-1">
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
