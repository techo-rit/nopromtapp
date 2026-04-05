import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface BottomNavProps {
    cartCount?: number;
    onCartClick?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
    cartCount = 0,
    onCartClick,
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isHome = location.pathname === '/';
    const isRooms = location.pathname === '/changing-room';

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a] border-t border-[#1e1e1e]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            <div className="flex items-center justify-around h-[60px]">

                {/* Home */}
                <button
                    onClick={() => navigate('/')}
                    className="flex flex-col items-center justify-center gap-1 min-w-[80px] min-h-[56px] active:scale-95 transition-transform"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isHome ? '#d4b872' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        <polyline points="9,22 9,12 15,12 15,22" />
                    </svg>
                    <span className="text-[10px] font-medium tracking-wide" style={{ color: isHome ? '#d4b872' : '#666' }}>Home</span>
                </button>

                {/* Room */}
                <button
                    onClick={() => navigate('/changing-room')}
                    className="flex flex-col items-center justify-center gap-1 min-w-[80px] min-h-[56px] active:scale-95 transition-transform"
                >
                    <svg width="20" height="20" viewBox="0 0 512.026 512.026" fill={isRooms ? '#d4b872' : '#666'}>
                        <path d="M417.758,108.407c-1.212-3.874-13.918-37.538-93.483-55.543V29.901v-5.41c0-8.124-5.794-14.916-13.901-16.427c-35.567-10.752-73.156-10.752-108.723,0c-8.107,1.51-13.909,8.303-13.909,16.427v5.41v22.963c-79.556,18.005-92.262,51.669-93.474,55.543c-0.657,2.108-0.469,4.386,0.512,6.366l14.242,28.493c12.425,24.841,18.987,52.651,18.987,80.427v262.733c0,14.114,11.486,25.6,25.6,25.6h93.867V68.292c0-0.094,0.051-0.162,0.051-0.247c-16.316-0.862-31.514-4.147-42.718-9.216V43.042c14.532,5.265,32.461,8.183,51.2,8.183c18.748,0,36.676-2.918,51.2-8.183v15.787c-11.196,5.069-26.394,8.354-42.709,9.216c0,0.085,0.043,0.154,0.043,0.247v443.733h93.867c14.123,0,25.6-11.486,25.6-25.6V223.693c0-27.776,6.571-55.586,18.995-80.427l14.242-28.493C418.227,112.794,418.415,110.515,417.758,108.407z" />
                    </svg>
                    <span className="text-[10px] font-medium tracking-wide" style={{ color: isRooms ? '#d4b872' : '#666' }}>Room</span>
                </button>

                {/* Bag */}
                <button
                    onClick={() => onCartClick?.()}
                    className="relative flex flex-col items-center justify-center gap-1 min-w-[80px] min-h-[56px] active:scale-95 transition-transform"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={cartCount > 0 ? '#d4b872' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 01-8 0" />
                    </svg>
                    {cartCount > 0 && (
                        <span className="absolute top-2 right-3 min-w-[16px] h-4 bg-[#d4b872] text-[#0a0a0a] text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                            {cartCount > 9 ? '9+' : cartCount}
                        </span>
                    )}
                    <span className="text-[10px] font-medium tracking-wide" style={{ color: cartCount > 0 ? '#d4b872' : '#666' }}>Bag</span>
                </button>

            </div>
        </nav>
    );
};
