import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { RemixLogoIcon, ArrowLeftIcon } from "../../shared/ui/Icons";
import type { User } from "../../types";

interface HeaderProps {
    user: User | null;
    onSignIn: () => void;
    onLogout: () => void;
    onUpgrade?: () => void;
    isLoading?: boolean;
    isSecondaryPage?: boolean;
    onBack?: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    cartCount?: number;
    onCartClick?: () => void;
}

const SearchIcon: React.FC = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
        <circle cx="11" cy="11" r="8" stroke="#6b6b6b" strokeWidth="2" />
        <path d="M21 21l-4.35-4.35" stroke="#6b6b6b" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

export const Header: React.FC<HeaderProps> = ({
    user,
    onSignIn,
    onLogout,
    onUpgrade,
    isSecondaryPage = false,
    onBack,
    searchQuery,
    onSearchChange,
    cartCount = 0,
    onCartClick,
}) => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    const creationsLeft = user?.creationsLeft ?? 0;

    useEffect(() => {
        if (!showUserMenu) return;
        const close = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [showUserMenu]);

    // Secondary page header (product pages, etc.) — desktop only
    if (isSecondaryPage) {
        return (
            <header className="hidden md:block sticky top-0 z-50 w-full bg-[#0a0a0a] border-b border-[#2a2a2a] h-[60px]">
                <div className="w-full h-full max-w-[1440px] mx-auto px-8 flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-1 text-[#f5f5f5] hover:text-[#c9a962] transition-colors shrink-0 cursor-pointer"
                    >
                        <ArrowLeftIcon />
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 text-[#f5f5f5] hover:text-[#c9a962] transition-colors cursor-pointer"
                    >
                        <RemixLogoIcon />
                    </button>
                </div>
            </header>
        );
    }

    // Main header — desktop only, NO mobile header
    return (
        <header className="hidden md:block relative w-full bg-[#0a0a0a] border-b border-[#1a1a1a] z-50">
            {/* Top row: Logo + Nav + User */}
            <div className="w-full max-w-[1440px] mx-auto px-8 h-[80px] flex items-center justify-between">
                <div className="flex items-center gap-12">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#f5f5f5] hover:cursor-pointer hover:opacity-80 transition-opacity"
                    >
                        <RemixLogoIcon />
                        <span>stiri.in</span>
                    </button>
                    <nav className="flex items-center gap-1">
                        {[
                            { label: 'Home', path: '/', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9,22 9,12 15,12 15,22" /></svg>) },
                            { label: 'Closet', path: '/closet', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L8 6h8l-4-4z" /><path d="M4 6h16v2H4z" /><path d="M8 10c0 2 1.5 3 4 3s4-1 4-3" /><path d="M9 13l-1 9" /><path d="M15 13l1 9" /></svg>) },
                            { label: 'Room', path: '/changing-room', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M6 21v-1a6 6 0 0112 0v1" /></svg>) },
                            { label: 'Concierge', path: '/search', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>) },
                        ].map((link) => {
                            const isActive = location.pathname === link.path;
                            return (
                                <button
                                    key={link.path}
                                    onClick={() => navigate(link.path)}
                                    title={link.label}
                                    className={`relative min-h-[44px] w-11 flex items-center justify-center cursor-pointer rounded-xl transition-all duration-200 ${
                                        isActive
                                            ? "text-[#c9a962]"
                                            : "text-[#6b6b6b] hover:text-[#f5f5f5]"
                                    }`}
                                >
                                    {link.icon}
                                    {isActive && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#c9a962]" />}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    {/* Cart */}
                    {onCartClick && (
                        <button
                            onClick={onCartClick}
                            className="relative p-2 text-[#a0a0a0] hover:text-[#f5f5f5] transition-colors cursor-pointer"
                            aria-label="Open cart"
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <path d="M16 10a4 4 0 01-8 0" />
                            </svg>
                            {cartCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#c9a962] text-[#0a0a0a] text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                    {cartCount > 9 ? '9+' : cartCount}
                                </span>
                            )}
                        </button>
                    )}

                    {!user ? (
                        <button
                            onClick={onSignIn}
                            className="min-h-[44px] px-6 py-2.5 bg-[#1a1a1a] text-[#f5f5f5] rounded-full border border-[#3a3a3a] hover:border-[#c9a962]/30 cursor-pointer transition-all"
                        >
                            Sign In
                        </button>
                    ) : (
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-[#1a1a1a] transition-all cursor-pointer"
                            >
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-[#2a2a2a]" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className="w-8 h-8 bg-[#c9a962] rounded-full flex items-center justify-center text-[#0a0a0a] font-medium text-sm">
                                        {user.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                )}
                                <span className="text-sm font-medium text-[#a0a0a0] hidden lg:block">
                                    {user.name?.split(" ")[0]}
                                </span>
                            </button>
                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-lg py-2 z-50">
                                    <div className="px-4 py-3 border-b border-[#2a2a2a]">
                                        <p className="text-sm font-medium text-[#f5f5f5] truncate">{user.name}</p>
                                        <p className="text-xs text-[#6b6b6b] truncate mt-0.5">{creationsLeft} credits left</p>
                                    </div>
                                    {onUpgrade && (
                                        <button
                                            onClick={() => { onUpgrade(); setShowUserMenu(false); }}
                                            className="w-full text-left px-4 py-3 text-sm text-[#c9a962] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                                        >
                                            Upgrade
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { navigate('/profile'); setShowUserMenu(false); }}
                                        className="w-full text-left px-4 py-3 text-sm text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-[#f5f5f5] transition-colors cursor-pointer"
                                    >
                                        View Profile
                                    </button>
                                    <button
                                        onClick={() => { onLogout(); setShowUserMenu(false); }}
                                        className="w-full text-left px-4 py-3 text-sm text-[#FF453A] hover:bg-[#FF453A]/5 transition-colors cursor-pointer"
                                    >
                                        Log Out
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>


        </header>
    );
};
