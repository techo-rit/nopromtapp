import React, { useEffect, useRef, useState } from "react";
import { RemixLogoIcon, ArrowLeftIcon } from "../../shared/ui/Icons";
import type { User, NavCategory } from "../../types";

interface HeaderProps {
    activeNav: NavCategory;
    onNavClick: (category: NavCategory) => void;
    user: User | null;
    onSignIn: () => void;
    accounts: Array<{ email: string; name: string }>;
    onSwitchAccount: (email: string) => void;
    onAddAccount: () => void;
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
    accounts,
    onSwitchAccount,
    onAddAccount,
    onLogout,
    onUpgrade,
    isLoading = false,
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

    const commonTextClasses =
        "text-[15px] font-normal leading-none text-[#f5f5f5]";
    const inputClasses = `${commonTextClasses} bg-transparent placeholder-[#E4C085]/70 italic focus:outline-none w-[11ch] text-left`;
    const otherAccounts = accounts.filter((account) => account.email !== user?.email);
    const hasOtherAccounts = accounts.length > 1 && otherAccounts.length > 0;

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

    if (isSecondaryPage) {
        return (
            <header className="sticky top-0 z-50 w-full bg-[#0a0a0a] border-b border-[#2a2a2a] h-[60px]">
                <div className="w-full h-full max-w-[1440px] mx-auto px-3 flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-1 text-[#f5f5f5] hover:text-[#c9a962] transition-colors shrink-0"
                    >
                        <ArrowLeftIcon />
                    </button>

                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 h-[40px] px-2 bg-transparent cursor-text">
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

                    <button
                        onClick={onUpgrade}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-[#3a3a3a] rounded-full hover:border-[#c9a962]/50 hover:bg-[#c9a962]/5 transition-all active:scale-95"
                    >
                        <svg
                            className="w-3.5 h-3.5 text-[#c9a962]"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        <span className={commonTextClasses}>
                            {user ? `${user.credits || 0}` : "0"}{" "}
                            <span className="text-[#6b6b6b]">credits</span>
                        </span>
                    </button>
                </div>
            </header>
        );
    }

    return (
        <>
            <header className="md:hidden relative w-full h-[56px] bg-[#0a0a0a] border-b border-[#2a2a2a] z-50 overflow-hidden">
                <div className="w-full h-full px-3 flex items-center justify-between relative">
                    <span className={`${commonTextClasses} text-[#E4C085] z-10`}>
                        Manifesting
                    </span>

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-1 h-[40px] z-0">
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

                    <button
                        onClick={onUpgrade}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-[#3a3a3a] rounded-full z-10 hover:border-[#c9a962]/50 hover:bg-[#c9a962]/5 transition-all active:scale-95"
                    >
                        <svg
                            className="w-3.5 h-3.5 text-[#c9a962]"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        <span className={commonTextClasses}>
                            {user ? `${user.credits || 0}` : "0"}{" "}
                            <span className="text-[#6b6b6b]">credits</span>
                        </span>
                    </button>
                </div>
            </header>

            <header className="hidden md:block relative w-full bg-[#0a0a0a] z-50">
                <div className="w-full max-w-[1440px] mx-auto px-8 h-[80px] flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        <div className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#f5f5f5] hover:cursor-pointer">
                            <RemixLogoIcon />
                            <span>stiri.in</span>
                        </div>
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
                                    <div className="w-8 h-8 bg-[#c9a962] rounded-full flex items-center justify-center text-[#0a0a0a] font-medium text-sm">
                                        {user?.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-[#a0a0a0] hidden lg:block">
                                        {user?.name?.split(" ")[0]}
                                    </span>
                                </button>
                                {showUserMenu && (
                                    <div className="absolute right-0 mt-2 w-56 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-lg py-2 z-50">
                                        <div className={`px-4 py-3 flex items-start justify-between gap-3 ${hasOtherAccounts ? "border-b border-[#2a2a2a]" : ""}`}>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-[#f5f5f5] truncate">
                                                    {user.name}
                                                </p>
                                                <p className="text-xs text-[#6b6b6b] truncate">
                                                    {user.email}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    title="Add account"
                                                    aria-label="Add account"
                                                    onClick={() => {
                                                        onAddAccount();
                                                        setShowUserMenu(false);
                                                    }}
                                                    className="p-1.5 rounded-md text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                                                >
                                                    <svg
                                                        className="w-4 h-4"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                    >
                                                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    title="Log out"
                                                    aria-label="Log out"
                                                    onClick={() => {
                                                        onLogout();
                                                        setShowUserMenu(false);
                                                    }}
                                                    className="p-1.5 rounded-md text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                                                >
                                                    <svg
                                                        className="w-4 h-4"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                    >
                                                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" />
                                                        <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M21 12H9" strokeLinecap="round" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        {hasOtherAccounts && (
                                            <div className="py-1">
                                                <p className="px-4 py-2 text-[11px] uppercase tracking-wider text-[#6b6b6b]">
                                                    Other accounts
                                                </p>
                                                {otherAccounts.map((account) => {
                                                    return (
                                                        <button
                                                            key={account.email}
                                                            onClick={() => onSwitchAccount(account.email)}
                                                            className="w-full min-h-[40px] text-left px-4 py-2 text-sm transition-colors flex items-center justify-between text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-[#f5f5f5] cursor-pointer"
                                                        >
                                                            <span className="truncate pr-2">
                                                                {account.name || account.email}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full border-t border-[#2a2a2a]">
                    <div className="max-w-[720px] mx-auto h-[56px] flex items-center justify-center gap-8">
                        <span className="text-[#E4C085] text-base font-medium whitespace-nowrap">
                            Manifesting
                        </span>
                        <div className="flex items-center gap-1 h-[40px] px-2 bg-transparent">
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
                        <button
                            onClick={onUpgrade}
                            className="shrink-0 flex items-center gap-2 px-4 py-2 border border-[#3a3a3a] rounded-full hover:border-[#c9a962]/50 hover:bg-[#c9a962]/5 transition-all active:scale-95 hover:cursor-pointer"
                        >
                            <svg className="w-4 h-4 text-[#c9a962]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                            <span className="text-sm font-medium text-[#f5f5f5] whitespace-nowrap">
                                {user ? `${user.credits || 0}` : "0"} credits
                            </span>
                        </button>
                    </div>
                </div>
            </header>
        </>
    );
};
