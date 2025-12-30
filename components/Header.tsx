import React, { useState, useRef } from "react";
import { RemixLogoIcon, ArrowLeftIcon } from "./Icons";
import type { User } from "../types";

type NavCategory = "Try on" | "Creators";

interface HeaderProps {
    activeNav: NavCategory;
    onNavClick: (category: NavCategory) => void;
    user: User | null;
    onSignIn: () => void;
    onLogout: () => void;
    isLoading?: boolean;
    isSecondaryPage?: boolean;
    onBack?: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

const SearchIcon: React.FC = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
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
    isLoading = false,
    isSecondaryPage = false,
    onBack,
    searchQuery,
    onSearchChange,
}) => {
    const navItems: NavCategory[] = ["Creators", "Try on"];
    const [showUserMenu, setShowUserMenu] = useState(false);
    const mobileSearchRef = useRef<HTMLInputElement>(null);
    const desktopSearchRef = useRef<HTMLInputElement>(null);

    // Common Input Styling to fix the "Bold/Big" issue
    const inputClasses = "flex-1 min-w-0 bg-transparent text-sm md:text-base text-[#f5f5f5] placeholder-[#E4C085]/60 font-normal italic focus:outline-none";

    // 1. SECONDARY NAV
    if (isSecondaryPage) {
        return (
            <header className="sticky top-0 z-50 w-full bg-[#0a0a0a] border-b border-[#2a2a2a] h-[60px]">
                <div className="w-full h-full max-w-[1440px] mx-auto px-4 flex items-center justify-between gap-2">
                    <button 
                        onClick={onBack}
                        className="p-2 -ml-2 text-[#f5f5f5] hover:text-[#c9a962] transition-colors shrink-0"
                        aria-label="Go back"
                    >
                        <ArrowLeftIcon />
                    </button>

                    <div className="flex-1 max-w-[720px] flex items-center gap-2 h-[40px] px-3 bg-[#1a1a1a]/50 rounded-lg">
                        <SearchIcon />
                        <input
                            ref={mobileSearchRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="desire for..."
                            className={inputClasses}
                        />
                    </div>

                    <div className="shrink-0 hidden sm:flex items-center px-4 py-2 border border-[#3a3a3a] rounded-full">
                        <span className="text-sm font-medium text-[#f5f5f5] whitespace-nowrap">12 days</span>
                    </div>
                </div>
            </header>
        );
    }

    return (
        <>
            {/* MOBILE TOP BAR */}
            <header className="md:hidden relative w-full h-[56px] bg-[#0a0a0a] border-b border-[#2a2a2a] z-50">
                <div className="w-full h-full px-4 flex items-center gap-2">
                    {/* Hidden on very small screens to save space */}
                    <span className="text-[#E4C085] text-sm font-medium whitespace-nowrap hidden min-[350px]:block">
                        Manifesting
                    </span>

                    <div className="flex-1 min-w-0 flex items-center gap-2 h-[38px] px-3 bg-[#1a1a1a] rounded-md">
                        <SearchIcon />
                        <input
                            ref={mobileSearchRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="desire for..."
                            className={inputClasses}
                        />
                    </div>

                    <div className="shrink-0 flex items-center px-3 py-1.5 border border-[#3a3a3a] rounded-full">
                        <span className="text-xs font-medium text-[#f5f5f5] whitespace-nowrap">12d</span>
                    </div>
                </div>
            </header>

            {/* DESKTOP HEADER */}
            <header className="hidden md:block relative w-full bg-[#0a0a0a] z-50">
                <div className="w-full max-w-[1440px] mx-auto px-8 h-[80px] flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        <div className="flex items-center gap-2 text-xl font-bold text-[#f5f5f5]">
                            <RemixLogoIcon />
                            <span>nopromt.ai</span>
                        </div>
                        <nav className="flex items-center gap-2">
                            {navItems.map((item) => (
                                <button
                                    key={item}
                                    onClick={() => onNavClick(item)}
                                    className={`min-h-[44px] px-5 py-2.5 text-base font-medium rounded-full transition-all ${
                                        activeNav === item ? "bg-[#1a1a1a] text-[#f5f5f5] border border-[#3a3a3a]" : "text-[#a0a0a0] hover:text-[#f5f5f5]"
                                    }`}
                                >
                                    {item}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        {!user ? (
                            <button onClick={onSignIn} className="min-h-[44px] px-6 py-2.5 bg-[#1a1a1a] text-[#f5f5f5] rounded-full border border-[#3a3a3a] hover:bg-[#2a2a2a]">
                                Sign In
                            </button>
                        ) : (
                            <div className="relative">
                                <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-[#1a1a1a]">
                                    <div className="w-8 h-8 bg-[#c9a962] rounded-full flex items-center justify-center text-[#0a0a0a] font-medium text-sm">
                                        {user?.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-[#a0a0a0] hidden lg:block">{user?.name?.split(" ")[0]}</span>
                                </button>
                                {showUserMenu && (
                                    <div className="absolute right-0 mt-2 w-48 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-lg py-2">
                                        <button onClick={onLogout} className="w-full text-left px-4 py-3 text-sm text-[#a0a0a0] hover:bg-[#1a1a1a]">Log Out</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Manifesting Search Row - Desktop */}
                <div className="w-full border-t border-[#2a2a2a]">
                    <div className="max-w-[720px] mx-auto h-[56px] flex items-center justify-center gap-5">
                        <span className="text-[#E4C085] text-base font-medium">Manifesting</span>
                        <div className="w-[320px] flex items-center gap-2 h-[40px] px-4 bg-[#1a1a1a] rounded-lg">
                            <SearchIcon />
                            <input
                                ref={desktopSearchRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="desire for..."
                                className={inputClasses}
                            />
                        </div>
                        <div className="flex items-center px-4 py-2 border border-[#3a3a3a] rounded-full">
                            <span className="text-sm font-medium text-[#f5f5f5]">12 days</span>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};