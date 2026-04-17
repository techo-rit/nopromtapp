import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface FloatingSearchProps {
    searchQuery: string;
    onSearchChange: (q: string) => void;
}

export const FloatingSearch: React.FC<FloatingSearchProps> = () => {
    const location = useLocation();
    const navigate = useNavigate();

    if (location.pathname !== '/') return null;

    return (
        <div
            className="md:hidden fixed z-40 flex justify-center"
            style={{ bottom: `calc(60px + env(safe-area-inset-bottom) + 10px)`, left: 0, right: 0, pointerEvents: 'none' }}
        >
            <button
                onClick={() => navigate('/chat')}
                className="w-12 h-12 rounded-full flex items-center justify-center active:scale-90"
                style={{
                    background: 'linear-gradient(135deg, rgba(201,169,98,0.25), rgba(212,184,114,0.15))',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(201,169,98,0.35)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 12px rgba(201,169,98,0.15)',
                    pointerEvents: 'auto',
                    transition: 'transform 100ms ease',
                }}
                aria-label="Style Concierge"
            >
                <span className="text-[16px]">✨</span>
            </button>
        </div>
    );
};
