import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    const navItems: string[] = [];
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
                    {/* Changing Room icon */}
                    <button
                        onClick={() => navigate('/changing-room')}
                        className="p-1.5 text-[#a0a0a0] hover:text-[#f5f5f5] transition-colors shrink-0"
                        aria-label="Changing Room"
                    >
                        <svg width="20" height="20" viewBox="0 0 512.026 512.026" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M417.758,108.407c-1.212-3.874-13.918-37.538-93.483-55.543V29.901v-5.41c0-8.124-5.794-14.916-13.901-16.427c-35.567-10.752-73.156-10.752-108.723,0c-8.107,1.51-13.909,8.303-13.909,16.427v5.41v22.963c-79.556,18.005-92.262,51.669-93.474,55.543c-0.657,2.108-0.469,4.386,0.512,6.366l14.242,28.493c12.425,24.841,18.987,52.651,18.987,80.427v262.733c0,14.114,11.486,25.6,25.6,25.6h93.867V68.292c0-0.094,0.051-0.162,0.051-0.247c-16.316-0.862-31.514-4.147-42.718-9.216V43.042c14.532,5.265,32.461,8.183,51.2,8.183c18.748,0,36.676-2.918,51.2-8.183v15.787c-11.196,5.069-26.394,8.354-42.709,9.216c0,0.085,0.043,0.154,0.043,0.247v443.733h93.867c14.123,0,25.6-11.486,25.6-25.6V223.693c0-27.776,6.571-55.586,18.995-80.427l14.242-28.493C418.227,112.794,418.415,110.515,417.758,108.407z M204.117,378.854l-25.6,59.733c-1.382,3.234-4.531,5.18-7.842,5.18c-1.118,0-2.261-0.23-3.354-0.7c-4.335-1.852-6.34-6.869-4.48-11.204l25.6-59.733c1.843-4.335,6.904-6.332,11.196-4.48C203.972,369.502,205.978,374.519,204.117,378.854z M307.209,24.602c-13.286,6.084-31.582,9.557-51.2,9.557c-19.439,0-37.598-3.405-50.859-9.395c0.316-0.06,0.64-0.119,0.947-0.205c32.666-9.984,67.166-9.984,99.831,0c0.085,0.017,0.179,0.026,0.256,0.026c0.341,0,0.683-0.162,1.024-0.094V24.602z M344.704,443.068c-1.092,0.469-2.236,0.7-3.362,0.7c-3.302,0-6.451-1.946-7.834-5.18l-25.6-59.733c-1.86-4.335,0.145-9.353,4.48-11.204c4.292-1.86,9.344,0.145,11.196,4.48l25.6,59.733C351.044,436.198,349.039,441.216,344.704,443.068z" />
                        </svg>
                    </button>
                    {onCartClick && (
                        <button
                            onClick={onCartClick}
                            className="relative p-1.5 text-[#a0a0a0] hover:text-[#f5f5f5] transition-colors shrink-0"
                            aria-label="Open cart"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <path d="M16 10a4 4 0 01-8 0" />
                            </svg>
                            {cartCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#c9a962] text-[#0a0a0a] text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {cartCount > 9 ? '9+' : cartCount}
                                </span>
                            )}
                        </button>
                    )}
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
                        <button
                            onClick={() => navigate('/changing-room')}
                            className="p-2 text-[#a0a0a0] hover:text-[#f5f5f5] transition-colors"
                            aria-label="Changing Room"
                        >
                            <svg width="22" height="22" viewBox="0 0 512.026 512.026" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M417.758,108.407c-1.212-3.874-13.918-37.538-93.483-55.543V29.901v-5.41c0-8.124-5.794-14.916-13.901-16.427c-35.567-10.752-73.156-10.752-108.723,0c-8.107,1.51-13.909,8.303-13.909,16.427v5.41v22.963c-79.556,18.005-92.262,51.669-93.474,55.543c-0.657,2.108-0.469,4.386,0.512,6.366l14.242,28.493c12.425,24.841,18.987,52.651,18.987,80.427v262.733c0,14.114,11.486,25.6,25.6,25.6h93.867V68.292c0-0.094,0.051-0.162,0.051-0.247c-16.316-0.862-31.514-4.147-42.718-9.216V43.042c14.532,5.265,32.461,8.183,51.2,8.183c18.748,0,36.676-2.918,51.2-8.183v15.787c-11.196,5.069-26.394,8.354-42.709,9.216c0,0.085,0.043,0.154,0.043,0.247v443.733h93.867c14.123,0,25.6-11.486,25.6-25.6V223.693c0-27.776,6.571-55.586,18.995-80.427l14.242-28.493C418.227,112.794,418.415,110.515,417.758,108.407z M204.117,378.854l-25.6,59.733c-1.382,3.234-4.531,5.18-7.842,5.18c-1.118,0-2.261-0.23-3.354-0.7c-4.335-1.852-6.34-6.869-4.48-11.204l25.6-59.733c1.843-4.335,6.904-6.332,11.196-4.48C203.972,369.502,205.978,374.519,204.117,378.854z M307.209,24.602c-13.286,6.084-31.582,9.557-51.2,9.557c-19.439,0-37.598-3.405-50.859-9.395c0.316-0.06,0.64-0.119,0.947-0.205c32.666-9.984,67.166-9.984,99.831,0c0.085,0.017,0.179,0.026,0.256,0.026c0.341,0,0.683-0.162,1.024-0.094V24.602z M344.704,443.068c-1.092,0.469-2.236,0.7-3.362,0.7c-3.302,0-6.451-1.946-7.834-5.18l-25.6-59.733c-1.86-4.335,0.145-9.353,4.48-11.204c4.292-1.86,9.344,0.145,11.196,4.48l25.6,59.733C351.044,436.198,349.039,441.216,344.704,443.068z" />
                            </svg>
                        </button>
                        {onCartClick && (
                            <button
                                onClick={onCartClick}
                                className="relative p-2 text-[#a0a0a0] hover:text-[#f5f5f5] transition-colors"
                                aria-label="Open cart"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <path d="M16 10a4 4 0 01-8 0" />
                                </svg>
                                {cartCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-[#c9a962] text-[#0a0a0a] text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {cartCount > 9 ? '9+' : cartCount}
                                    </span>
                                )}
                            </button>
                        )}
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
