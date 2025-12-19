import React, { useState, useRef } from "react";
import { RemixLogoIcon } from "./Icons";
import type { User } from "../types";

type NavCategory = "Try on" | "Creators";

interface HeaderProps {
    activeNav: NavCategory;
    onNavClick: (category: NavCategory) => void;
    user: User | null;
    onSignIn: () => void;
    onLogout: () => void;
    isLoading?: boolean;
}

const SearchIcon: React.FC = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
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
}) => {
    const navItems: NavCategory[] = ["Creators", "Try on"];
    const [showUserMenu, setShowUserMenu] = useState(false);
    const mobileSearchRef = useRef<HTMLInputElement>(null);
    const desktopSearchRef = useRef<HTMLInputElement>(null);

    return (
        <>
            {/* MOBILE TOP BAR */}
            <header className="md:hidden relative w-full h-[56px] bg-[#0a0a0a] z-50">
                <div className="w-full h-full px-4 flex items-center gap-3">
                    <span className="text-[#E4C085] text-[17px] font-medium tracking-normal whitespace-nowrap">
                        Manifesting
                    </span>

                    <div className="flex-1 min-w-0">
                        <div
                            className="flex items-center gap-2 h-[40px] px-4 bg-transparent cursor-text"
                            onClick={() => mobileSearchRef.current?.focus()}
                        >
                            <SearchIcon />
                            <input
                                ref={mobileSearchRef}
                                type="text"
                                placeholder="desire for..."
                                className="flex-1 min-w-0 bg-transparent text-sm text-[#f5f5f5] placeholder-[#6b6b6b] focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center px-4 py-2 bg-transparent border border-[#3a3a3a] rounded-full">
                        <span className="text-sm font-medium text-[#f5f5f5] whitespace-nowrap">
                            12 days
                        </span>
                    </div>
                </div>
            </header>

            {/* DESKTOP HEADER */}
            <header className="hidden md:block relative w-full bg-[#0a0a0a] z-50">
                {/* Main Nav Row */}
                <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 h-[80px] flex items-center justify-between">
                    <div className="flex items-center gap-6 sm:gap-12">
                        <div className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#f5f5f5]">
                            <RemixLogoIcon />
                            <span>nopromt.ai</span>
                        </div>
                        <nav className="flex items-center gap-2">
                            {navItems.map((item) => (
                                <button
                                    key={item}
                                    onClick={() => onNavClick(item)}
                                    aria-label={`Maps to ${item} page`}
                                    className={`min-h-[44px] px-5 py-2.5 text-base font-medium rounded-full transition-all duration-200 ease-in-out focus:outline-none ${
                                        activeNav === item
                                            ? "bg-[#1a1a1a] text-[#f5f5f5] border border-[#3a3a3a]"
                                            : "text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#1a1a1a]"
                                    }`}
                                >
                                    {item}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Right side - Auth Button, User Menu, OR SKELETON */}
                    <div className="flex items-center gap-4">
                        {isLoading ? (
                            <div className="flex items-center gap-3 animate-pulse">
                                <div className="w-8 h-8 bg-[#2a2a2a] rounded-full"></div>
                                <div className="h-4 w-20 bg-[#2a2a2a] rounded hidden sm:block"></div>
                            </div>
                        ) : !user ? (
                            <button
                                onClick={onSignIn}
                                className="min-h-[44px] px-6 py-2.5 bg-[#1a1a1a] text-[#f5f5f5] font-medium rounded-full border border-[#3a3a3a] hover:bg-[#2a2a2a] hover:border-[#c9a962]/30 transition-all duration-200 focus:outline-none"
                            >
                                Sign In
                            </button>
                        ) : (
                            <div className="relative">
                                <button
                                    onClick={() =>
                                        setShowUserMenu(!showUserMenu)
                                    }
                                    className="min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-full hover:bg-[#1a1a1a] transition-all focus:outline-none"
                                >
                                    <div className="w-8 h-8 bg-[#c9a962] rounded-full flex items-center justify-center text-[#0a0a0a] font-medium text-sm">
                                        {user?.name?.charAt(0)?.toUpperCase() ||
                                            "A"}
                                    </div>
                                    <span className="text-sm font-medium text-[#a0a0a0] hidden sm:block">
                                        {user?.name?.split(" ")[0] || "User"}
                                    </span>
                                </button>

                                {showUserMenu && (
                                    <div className="absolute right-0 mt-2 w-48 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-lg py-2 z-50">
                                        <div className="px-4 py-3 border-b border-[#2a2a2a]">
                                            <p className="text-sm font-medium text-[#f5f5f5]">
                                                {user.name}
                                            </p>
                                            <p className="text-xs text-[#6b6b6b]">
                                                {user.email}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                onLogout();
                                                setShowUserMenu(false);
                                            }}
                                            className="w-full min-h-[44px] text-left px-4 py-3 text-sm text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-[#f5f5f5] transition-colors"
                                        >
                                            Log Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Manifesting Search Row - Desktop */}
                <div className="w-full border-t border-[#2a2a2a]">
                    <div className="max-w-[720px] mx-auto h-[56px] flex items-center justify-center gap-5">
                        <span className="text-[#E4C085] text-base font-medium tracking-wide whitespace-nowrap">
                            Manifesting
                        </span>

                        <div className="w-[280px]">
                            <div
                                className="flex items-center gap-2 h-[40px] px-4 bg-transparent cursor-text"
                                onClick={() =>
                                    desktopSearchRef.current?.focus()
                                }
                            >
                                <SearchIcon />
                                <input
                                    ref={desktopSearchRef}
                                    type="text"
                                    placeholder="desire for..."
                                    className="flex-1 min-w-0 bg-transparent text-sm text-[#f5f5f5] placeholder-[#6b6b6b] focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center px-4 py-2 bg-transparent border border-[#3a3a3a] rounded-full">
                            <span className="text-sm font-medium text-[#f5f5f5] whitespace-nowrap">
                                12 days
                            </span>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};
