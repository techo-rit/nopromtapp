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

const NAV_LINKS = [
    { label: 'Home', path: '/' },
    { label: 'Closet', path: '/closet' },
    { label: 'Changing Room', path: '/changing-room' },
    { label: 'Concierge', path: '/search' },
];

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

    const accountLabel = user?.accountType ? user.accountType.charAt(0).toUpperCase() + user.accountType.slice(1) : "Free";
    const creationsLeft = user?.creationsLeft ?? 0;
    const isUltimate = user?.accountType === 'ultimate';
    const pillIsClickable = Boolean(user && !isUltimate && onUpgrade);

    useEffect(() => {
        if (!showUserMenu) return;
        const close = (e: MouseEvent) => {
            if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [showUserMenu]);

    const DropdownMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => (
        <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-[var(--radius-card)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] py-2">
            <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                    {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-border" referrerPolicy="no-referrer" />
                    ) : (
                        <div className="w-9 h-9 bg-gold rounded-full flex items-center justify-center text-base font-medium text-sm shrink-0">
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-primary truncate">{user?.name}</p>
                        <p className="text-[11px] text-tertiary mt-0.5">{accountLabel} / {creationsLeft} left</p>
                    </div>
                </div>
            </div>
            <div>
                {pillIsClickable && (
                    <button
                        onClick={() => { onUpgrade!(); onClose(); }}
                        className="w-full text-left px-4 py-3 text-sm text-gold hover:bg-gold-subtle transition-colors flex items-center gap-3 cursor-pointer"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 2l3.5 8L21 5l-2 11H5zm0 2h14v2H5v-2z" /></svg>
                        Upgrade
                    </button>
                )}
                <button
                    onClick={() => { navigate('/profile'); onClose(); }}
                    className="w-full text-left px-4 py-3 text-sm text-secondary hover:bg-elevated hover:text-primary transition-colors flex items-center gap-3 cursor-pointer"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" /><circle cx="12" cy="7" r="4" /></svg>
                    View Profile
                </button>
                <button
                    onClick={() => { onLogout(); onClose(); }}
                    className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error/5 transition-colors flex items-center gap-3 cursor-pointer"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" /><path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 12H9" strokeLinecap="round" /></svg>
                    Log Out
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop only — no mobile header at all */}
            <header
                className="hidden md:block fixed top-0 left-0 right-0 glass"
                style={{ zIndex: 'var(--z-nav)' as unknown as number }}
            >
                <div className="w-full max-w-[1440px] mx-auto px-8 h-[72px] flex items-center justify-between">
                    {/* Left: Logo + Nav */}
                    <div className="flex items-center gap-8">
                        {isSecondaryPage && (
                            <button
                                onClick={onBack}
                                className="p-2 -ml-2 text-secondary hover:text-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                aria-label="Go back"
                            >
                                <ArrowLeftIcon />
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary font-display cursor-pointer hover:opacity-80 transition-opacity"
                            aria-label="Go to home"
                        >
                            <RemixLogoIcon />
                            <span>stiri</span>
                        </button>

                        {/* Nav Links */}
                        <nav className="flex items-center gap-1">
                            {NAV_LINKS.map((link) => {
                                const isActive = location.pathname === link.path;
                                return (
                                    <button
                                        key={link.path}
                                        onClick={() => navigate(link.path)}
                                        className={`px-3.5 py-2 rounded-[var(--radius-pill)] text-[13px] font-medium tracking-wide transition-all cursor-pointer ${
                                            isActive
                                                ? 'text-gold bg-gold-subtle'
                                                : 'text-secondary hover:text-primary hover:bg-elevated'
                                        }`}
                                    >
                                        {link.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Center: Search bar — navigates to /search */}
                    <div className="flex-1 max-w-md mx-6">
                        <button
                            onClick={() => navigate('/search')}
                            className="w-full flex items-center gap-2.5 h-[42px] px-4 rounded-[var(--radius-pill)] border border-border hover:border-gold/40 hover:bg-elevated bg-surface transition-all cursor-pointer active:scale-[0.98]"
                            aria-label="Open search"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-tertiary">
                                <circle cx="11" cy="11" r="8" />
                                <path d="M21 21l-4.35-4.35" />
                            </svg>
                            <span className="flex-1 text-left text-[14px] text-tertiary">
                                Search styles, looks, outfits...
                            </span>
                        </button>
                    </div>

                    {/* Right: Cart + User */}
                    <div className="flex items-center gap-3">
                        {onCartClick && (
                            <button
                                onClick={onCartClick}
                                className="relative p-2 text-secondary hover:text-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                aria-label="Open cart"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <path d="M16 10a4 4 0 01-8 0" />
                                </svg>
                                {cartCount > 0 && (
                                    <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-gold text-base text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                                        {cartCount > 9 ? '9+' : cartCount}
                                    </span>
                                )}
                            </button>
                        )}
                        {!user ? (
                            <button
                                onClick={onSignIn}
                                className="h-[44px] px-6 bg-primary text-base rounded-[var(--radius-pill)] font-semibold text-[15px] hover:shadow-[0_4px_20px_rgba(242,242,247,0.15)] active:scale-[0.97] transition-all cursor-pointer"
                            >
                                Sign In
                            </button>
                        ) : (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-elevated transition-colors cursor-pointer"
                                >
                                    {user?.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-border" referrerPolicy="no-referrer" />
                                    ) : (
                                        <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center text-base font-medium text-sm">
                                            {user?.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                    )}
                                    <span className="text-sm font-medium text-secondary hidden lg:block">
                                        {user?.name?.split(" ")[0]}
                                    </span>
                                </button>
                                {showUserMenu && (
                                    <DropdownMenu onClose={() => setShowUserMenu(false)} />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>
        </>
    );
};
