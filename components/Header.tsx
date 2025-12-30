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
        width="15"
        height="15"
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

    // FIX: Standardized typography to prevent "bold/big" look
    // Removed the large text classes and ensured font-normal
    const inputClasses = "flex-1 min-w-0 bg-transparent text-[15px] md:text-base text-[#f5f5f5] placeholder-[#E4C085] font-normal italic focus:outline-none py-1";

    // 1. SECONDARY NAV
    if (isSecondaryPage) {
        return (
            <header className="sticky top-0 z-50 w-full bg-[#0a0a0a] border-b border-[#2a2a2a] h-[60px]">
                <div className="w-full h-full max-w-[1440px] mx-auto px-3 flex items-center justify-between gap-1">
                    <button 
                        onClick={onBack}
                        className="p-2 -ml-1 text-[#f5f5f5] hover:text-[#c9a962] transition-colors shrink-0"
                    >
                        <ArrowLeftIcon />
                    </button>

                    <div className="flex-1 max-w-[720px] flex items-center gap-2 h-[40px] px-2 bg-transparent cursor-text">
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

                    <div className="shrink-0 flex items-center px-3 py-1.5 border border-[#3a3a3a] rounded-full sm:px-4 sm:py-2">
                        <span className="text-[11px] sm:text-sm font-medium text-[#f5f5f5] whitespace-nowrap">12 days</span>
                    </div>
                </div>
            </header>
        );
    }

    return (
        <>
            {/* MOBILE TOP BAR - Optimized for 325px */}
            <header className="md:hidden relative w-full h-[56px] bg-[#0a0a0a] border-b border-[#2a2a2a] z-50">
                <div className="w-full h-full px-2 flex items-center justify-between gap-1.5">
                    {/* Keep text, but slightly smaller on ultra-mobile to fit */}
                    <span className="text-[#E4C085] text-[13px] min-[375px]:text-[15px] font-medium tracking-tight whitespace-nowrap shrink-0">
                        Manifesting
                    </span>

                    <div className="flex-1 min-w-0 flex items-center gap-1.5 h-[40px] px-1 bg-transparent cursor-text">
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

                    <div className="shrink-0 flex items-center px-2 py-1 bg-transparent border border-[#3a3a3a] rounded-full">
                        <span className="text-[11px] font-medium text-[#f5f5f5] whitespace-nowrap">
                            12 days
                        </span>
                    </div>
                </div>
            </header>

            {/* DESKTOP HEADER */}
            <header className="hidden md:block relative w-full bg-[#0a0a0a] z-50">
                <div className="w-full max-w-[1440px] mx-auto px-8 h-[80px] flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        <div className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#f5f5f5]">
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
                            <button onClick={onSignIn} className="min-h-[44px] px-6 py-2.5 bg-[#1a1a1a] text-[#f5f5f5] rounded-full border border-[#3a3a3a] hover:border-[#c9a962]/30 transition-all">
                                Sign In
                            </button>
                        ) : (
                            <div className="relative">
                                <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-[#1a1a1a] transition-all">
                                    <div className="w-8 h-8 bg-[#c9a962] rounded-full flex items-center justify-center text-[#0a0a0a] font-medium text-sm">
                                        {user?.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-[#a0a0a0] hidden lg:block">{user?.name?.split(" ")[0]}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Manifesting Search Row - Desktop */}
                <div className="w-full border-t border-[#2a2a2a]">
                    <div className="max-w-[720px] mx-auto h-[56px] flex items-center justify-center gap-5">
                        <span className="text-[#E4C085] text-base font-medium whitespace-nowrap">
                            Manifesting
                        </span>
                        <div className="w-[300px] flex items-center gap-2 h-[40px] px-2 bg-transparent">
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
                        <div className="shrink-0 flex items-center px-4 py-2 border border-[#3a3a3a] rounded-full">
                            <span className="text-sm font-medium text-[#f5f5f5] whitespace-nowrap">12 days</span>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};