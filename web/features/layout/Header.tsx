import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RemixLogoIcon, ArrowLeftIcon } from "../../shared/ui/Icons";
import type { User, NavCategory } from "../../types";

interface HeaderProps {
    activeNav: NavCategory;
    onNavClick: (category: NavCategory) => void;
    user: User | null;
    onSignIn: () => void;
    onLogout: () => void;
    onUpgrade?: () => void;
    isLoading?: boolean;
    isSecondaryPage?: boolean;
    onBack?: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

const SearchIcon: React.FC = () => (
    <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 cursor-pointer"
    >
        <circle cx="11" cy="11" r="8" stroke="#6b6b6b" strokeWidth="2" />
        <path
            d="M21 21l-4.35-4.35"
            stroke="#6b6b6b"
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

export const Header: React.FC<HeaderProps> = ({
    activeNav,
    onNavClick,
    user,
    onSignIn,
    onLogout,
    onUpgrade,
    isSecondaryPage = false,
    onBack,
    searchQuery,
    onSearchChange,
}) => {
    const navItems: NavCategory[] = ["Creators", "Try on"];
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const mobileSearchRef = useRef<HTMLInputElement>(null);
    const desktopSearchRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const commonTextClasses =
        "text-[15px] font-normal leading-none text-[#f5f5f5]";
    const inputClasses = `${commonTextClasses} bg-transparent placeholder-[#E4C085]/70 italic focus:outline-none w-[11ch] text-center`;
    const accountLabel = user?.accountType ? user.accountType.charAt(0).toUpperCase() + user.accountType.slice(1) : "Free";
    const creationsLeft = user?.creationsLeft ?? 0;
    const isUltimate = user?.accountType === 'ultimate';
    const pillIsClickable = Boolean(user && !isUltimate && onUpgrade);

    useEffect(() => {
        if (!showUserMenu) return;
        const onDocumentClick = (event: MouseEvent) => {
            if (!userMenuRef.current) return;
            if (!userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener("mousedown", onDocumentClick);
        return () => document.removeEventListener("mousedown", onDocumentClick);
    }, [showUserMenu]);

    return (
        <>
            {/* ── Mobile ── */}
            <header className="md:hidden relative w-full h-[56px] bg-[#0a0a0a] border-b border-[#2a2a2a] z-50">
                <div className="w-full h-full px-3 flex items-center gap-2">
                    {isSecondaryPage && (
                        <button
                            onClick={onBack}
                            className="p-1.5 -ml-1 text-[#a0a0a0] hover:text-[#f5f5f5] transition-colors shrink-0"
                            aria-label="Go back"
                        >
                            <ArrowLeftIcon />
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-1.5 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        aria-label="Go to home"
                    >
                        <RemixLogoIcon />
                        <span className="text-[15px] font-bold tracking-tight text-[#f5f5f5]">stiri.in</span>
                    </button>

                    <div className="flex-1 min-w-0 mx-2 flex items-center gap-1 h-[40px] px-3 rounded-full border border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors">
                        <SearchIcon />
                        <input
                            ref={mobileSearchRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="desire for..."
                            className={`${inputClasses} flex-1 min-w-0 w-auto`}
                        />
                    </div>
                </div>
            </header>

            {/* ── Desktop ── */}
            <header className="hidden md:block relative w-full bg-[#0a0a0a] border-b border-[#2a2a2a] z-50">
                <div className="w-full max-w-[1440px] mx-auto px-8 h-[80px] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {isSecondaryPage && (
                            <button
                                onClick={onBack}
                                className="p-2 -ml-2 text-[#a0a0a0] hover:text-[#f5f5f5] transition-colors shrink-0"
                                aria-label="Go back"
                            >
                                <ArrowLeftIcon />
                            </button>
                        )}
                        <div className="flex items-center gap-12">
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#f5f5f5] cursor-pointer hover:opacity-80 transition-opacity"
                                aria-label="Go to home"
                            >
                                <RemixLogoIcon />
                                <span>stiri.in</span>
                            </button>
                            <nav className="flex items-center gap-2">
                                {navItems.map((item) => (
                                    <button
                                        key={item}
                                        onClick={() => onNavClick(item)}
                                        className={`min-h-[44px] px-5 py-2.5 cursor-pointer text-base font-medium rounded-full transition-all ${
                                            activeNav === item
                                                ? "bg-[#1a1a1a] text-[#f5f5f5] border border-[#3a3a3a]"
                                                : "text-[#a0a0a0] hover:text-[#f5f5f5]"
                                        }`}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    <div className="w-[45%] mx-auto flex items-center gap-1.5 h-[40px] px-4 rounded-full border border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors">
                        <SearchIcon />
                        <input
                            ref={desktopSearchRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="desire for..."
                            className={`${inputClasses} flex-1 min-w-0 w-auto`}
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        {!user ? (
                            <button
                                onClick={onSignIn}
                                className="min-h-[44px] px-6 py-2.5 bg-[#1a1a1a] text-[#f5f5f5] rounded-full border border-[#3a3a3a] hover:cursor-pointer hover:border-[#c9a962]/30 transition-all"
                            >
                                Sign In
                            </button>
                        ) : (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-[#1a1a1a] transition-all"
                                >
                                    {user?.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-[#2a2a2a]" referrerPolicy="no-referrer" />
                                    ) : (
                                        <div className="w-8 h-8 bg-[#c9a962] rounded-full flex items-center justify-center text-[#0a0a0a] font-medium text-sm">
                                            {user?.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                    )}
                                    <span className="text-sm font-medium text-[#a0a0a0] hidden lg:block">
                                        {user?.name?.split(" ")[0]}
                                    </span>
                                </button>
                                {showUserMenu && (
                                    <div className="absolute right-0 mt-2 w-56 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-lg py-2 z-50">
                                        <div className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {user.avatarUrl ? (
                                                    <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-[#2a2a2a]" referrerPolicy="no-referrer" />
                                                ) : null}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-[#f5f5f5] truncate">
                                                        {user.name}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="border-t border-[#2a2a2a]">
                                            <div className="px-4 py-3 text-xs text-[#6b6b6b]">
                                                Account: <span className="text-[#f5f5f5]">{accountLabel}</span>
                                                <span className="text-[#3a3a3a]"> • </span>
                                                {creationsLeft} left
                                            </div>
                                            {pillIsClickable && (
                                                <button
                                                    onClick={() => {
                                                        onUpgrade!();
                                                        setShowUserMenu(false);
                                                    }}
                                                    className="w-full text-left px-4 py-3 text-sm text-[#c9a962] hover:bg-[#1a1a1a] transition-colors flex items-center gap-3 cursor-pointer"
                                                >
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                                    </svg>
                                                    Upgrade Account
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    navigate('/profile');
                                                    setShowUserMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-3 text-sm text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-[#f5f5f5] transition-colors flex items-center gap-3 cursor-pointer"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" />
                                                    <circle cx="12" cy="7" r="4" />
                                                </svg>
                                                View Profile
                                            </button>
                                            <button
                                                onClick={() => {
                                                    onLogout();
                                                    setShowUserMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-400/5 transition-colors flex items-center gap-3 cursor-pointer"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" />
                                                    <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M21 12H9" strokeLinecap="round" />
                                                </svg>
                                                Log Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>
        </>
    );
};
