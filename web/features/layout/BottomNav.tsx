import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { User } from "../../types";

interface BottomNavProps {
    user: User | null;
    onSignIn: () => void;
    onLogout: () => void;
    onUpgrade?: () => void;
    cartCount?: number;
    onCartClick?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
    user,
    onSignIn,
    onLogout,
    onUpgrade,
    cartCount = 0,
    onCartClick,
}) => {
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const isHome = location.pathname === '/';
    const isRooms = location.pathname === '/changing-room';
    const isProfile = location.pathname === '/profile';

    const accountLabel = user?.accountType ? user.accountType.charAt(0).toUpperCase() + user.accountType.slice(1) : 'Free';
    const creationsLeft = user?.creationsLeft ?? 0;
    const isUltimate = user?.accountType === 'ultimate';
    const canUpgrade = Boolean(user && !isUltimate && onUpgrade);
    const accountBadgeClass = isUltimate
        ? 'text-[#c9a962] bg-[#c9a962]/10 border border-[#c9a962]/30'
        : user?.accountType === 'essentials'
        ? 'text-[#60a5fa] bg-[#60a5fa]/10 border border-[#60a5fa]/30'
        : 'text-[#a0a0a0] bg-[#2a2a2a] border border-[#3a3a3a]';

    const handleProfileClick = () => {
        if (!user) {
            onSignIn();
        } else {
            setShowProfileMenu(!showProfileMenu);
        }
    };

    return (
        <>
            {/* Profile Menu Overlay */}
            {showProfileMenu && user && (
                <div
                    className="md:hidden fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                />
            )}

            {/* Profile Menu */}
            {showProfileMenu && user && (
                <div className="md:hidden fixed bottom-[calc(60px+env(safe-area-inset-bottom))] right-4 z-50 w-60 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-lg py-2">
                    <div className="px-4 py-3">
                        <div className="flex items-center gap-2">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-[#2a2a2a]" referrerPolicy="no-referrer" />
                            ) : (
                                <div className="w-8 h-8 bg-[#c9a962] rounded-full flex items-center justify-center text-[#0a0a0a] font-medium text-sm shrink-0">
                                    {user.name?.charAt(0)?.toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-[#f5f5f5] truncate">{user.name}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[#2a2a2a] px-4 py-3">
                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${accountBadgeClass}`}>
                                {accountLabel}
                            </span>
                            <span className="text-xs text-[#6b6b6b]">
                                <span className="text-[#f5f5f5] font-medium">{creationsLeft}</span> creations left
                            </span>
                        </div>
                        {isUltimate && (
                            <p className="text-[10px] text-[#6b6b6b] mt-1.5">You're on our best plan ✦</p>
                        )}
                    </div>

                    <div className="border-t border-[#2a2a2a]">
                        {canUpgrade && (
                            <button
                                type="button"
                                onClick={() => { onUpgrade!(); setShowProfileMenu(false); }}
                                className="w-full text-left px-4 py-3 text-sm text-[#c9a962] hover:bg-[#c9a962]/5 transition-colors flex items-center gap-3 cursor-pointer"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M5 16L3 5l5.5 5L12 2l3.5 8L21 5l-2 11H5zm0 2h14v2H5v-2z" />
                                </svg>
                                Upgrade Account
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}
                            className="w-full text-left px-4 py-3 text-sm text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-[#f5f5f5] transition-colors flex items-center gap-3 cursor-pointer"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            View Profile
                        </button>
                        <button
                            type="button"
                            onClick={() => { onLogout(); setShowProfileMenu(false); }}
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

            <nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
                <div className="flex items-center justify-around h-[60px]">
                    {/* Home */}
                    <button
                        onClick={() => navigate('/')}
                        className="flex flex-col items-center justify-center gap-1 min-w-[70px] min-h-[56px] active:scale-95 transition-transform"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isHome ? '#c9a962' : '#6b6b6b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            <polyline points="9,22 9,12 15,12 15,22" />
                        </svg>
                        <span className={`text-[10px] font-medium ${isHome ? 'text-[#c9a962]' : 'text-[#6b6b6b]'}`}>
                            Home
                        </span>
                    </button>

                    {/* Rooms (Changing Room) */}
                    <button
                        onClick={() => navigate('/changing-room')}
                        className="flex flex-col items-center justify-center gap-1 min-w-[70px] min-h-[56px] active:scale-95 transition-transform"
                    >
                        <svg width="24" height="24" viewBox="0 0 512.026 512.026" fill={isRooms ? '#c9a962' : '#6b6b6b'} xmlns="http://www.w3.org/2000/svg">
                            <path d="M417.758,108.407c-1.212-3.874-13.918-37.538-93.483-55.543V29.901v-5.41c0-8.124-5.794-14.916-13.901-16.427c-35.567-10.752-73.156-10.752-108.723,0c-8.107,1.51-13.909,8.303-13.909,16.427v5.41v22.963c-79.556,18.005-92.262,51.669-93.474,55.543c-0.657,2.108-0.469,4.386,0.512,6.366l14.242,28.493c12.425,24.841,18.987,52.651,18.987,80.427v262.733c0,14.114,11.486,25.6,25.6,25.6h93.867V68.292c0-0.094,0.051-0.162,0.051-0.247c-16.316-0.862-31.514-4.147-42.718-9.216V43.042c14.532,5.265,32.461,8.183,51.2,8.183c18.748,0,36.676-2.918,51.2-8.183v15.787c-11.196,5.069-26.394,8.354-42.709,9.216c0,0.085,0.043,0.154,0.043,0.247v443.733h93.867c14.123,0,25.6-11.486,25.6-25.6V223.693c0-27.776,6.571-55.586,18.995-80.427l14.242-28.493C418.227,112.794,418.415,110.515,417.758,108.407z M204.117,378.854l-25.6,59.733c-1.382,3.234-4.531,5.18-7.842,5.18c-1.118,0-2.261-0.23-3.354-0.7c-4.335-1.852-6.34-6.869-4.48-11.204l25.6-59.733c1.843-4.335,6.904-6.332,11.196-4.48C203.972,369.502,205.978,374.519,204.117,378.854z M307.209,24.602c-13.286,6.084-31.582,9.557-51.2,9.557c-19.439,0-37.598-3.405-50.859-9.395c0.316-0.06,0.64-0.119,0.947-0.205c32.666-9.984,67.166-9.984,99.831,0c0.085,0.017,0.179,0.026,0.256,0.026c0.341,0,0.683-0.162,1.024-0.094V24.602z M344.704,443.068c-1.092,0.469-2.236,0.7-3.362,0.7c-3.302,0-6.451-1.946-7.834-5.18l-25.6-59.733c-1.86-4.335,0.145-9.353,4.48-11.204c4.292-1.86,9.344,0.145,11.196,4.48l25.6,59.733C351.044,436.198,349.039,441.216,344.704,443.068z" />
                        </svg>
                        <span className={`text-[10px] font-medium ${isRooms ? 'text-[#c9a962]' : 'text-[#6b6b6b]'}`}>
                            Rooms
                        </span>
                    </button>

                    {/* Bag */}
                    <button
                        onClick={() => onCartClick?.()}
                        className="relative flex flex-col items-center justify-center gap-1 min-w-[70px] min-h-[56px] active:scale-95 transition-transform"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={cartCount > 0 ? '#c9a962' : '#6b6b6b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <path d="M16 10a4 4 0 01-8 0" />
                        </svg>
                        {cartCount > 0 && (
                            <span className="absolute top-1 right-3 w-4 h-4 bg-[#c9a962] text-[#0a0a0a] text-[10px] font-bold rounded-full flex items-center justify-center">
                                {cartCount > 9 ? '9+' : cartCount}
                            </span>
                        )}
                        <span className={`text-[10px] font-medium ${cartCount > 0 ? 'text-[#c9a962]' : 'text-[#6b6b6b]'}`}>
                            Bag
                        </span>
                    </button>

                    {/* Me */}
                    <button
                        onClick={handleProfileClick}
                        className="flex flex-col items-center justify-center gap-1 min-w-[70px] min-h-[56px] active:scale-95 transition-transform"
                    >
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className={`w-6 h-6 rounded-full object-cover ${showProfileMenu || isProfile ? 'ring-2 ring-[#c9a962]' : ''}`} referrerPolicy="no-referrer" />
                        ) : user ? (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                showProfileMenu || isProfile ? 'bg-[#c9a962] text-[#0a0a0a]' : 'bg-[#2a2a2a] text-[#a0a0a0]'
                            }`}>
                                {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="2" strokeLinecap="round">
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        )}
                        <span className={`text-[10px] font-medium ${
                            showProfileMenu || isProfile ? 'text-[#c9a962]' : 'text-[#6b6b6b]'
                        }`}>
                            {user ? 'Me' : 'Sign In'}
                        </span>
                    </button>
                </div>
            </nav>
        </>
    );
};
