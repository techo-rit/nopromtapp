import React, { useState } from "react";
import type { User } from "../types";

type NavCategory = "Try on" | "Creators";

interface BottomNavProps {
    activeNav: NavCategory;
    onNavClick: (category: NavCategory) => void;
    user: User | null;
    onSignIn: () => void;
    onLogout: () => void;
}

const CreatorsIcon: React.FC<{ active?: boolean }> = ({ active }) => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M196.38 16.29l12.018 214.677-69.382-213.75h-19.65l70.52 217.25c-17.16-18.22-34.434-44.74-52.243-80.246 18.864 62.058 35.573 139.067 40.552 192.04L19.38 62.393v38.277l144.89 258.98c-33.493-21.316-67.86-56.375-97.918-92.87 26.712 52.73 55.26 104.847 73.076 160.54L19.378 289.453v28.46l107.997 124.026C99 434.69 70.625 422.05 42.25 408.165c38.03 26.607 62.036 50.897 84.234 85.82H230.84l-6.785-91.082H197.77c0-44.845 2.87-108.728 40.767-115.86-6.993-8.433-11.533-20.27-11.533-33.523 0-23.93 14.228-43.758 32.45-46.127h.005c.303-.038.61-.056.923-.063.934-.02 1.895.063 2.83.063 19.957 0 36.205 20.602 36.205 46.128 0 12.928-4.304 24.595-10.996 32.99 41.4 6.42 40.496 71.424 40.496 116.394h-24.94l-6.003 91.082h90.96c19.418-30.77 60.864-56.727 96.524-75.234-38.585 10.67-75.927 17.602-109.66 21.02l117.97-86.97v-23.218l-125.78 92.728c24.4-49.363 55.902-88.075 90.164-122.648-40.56 27.323-73.25 37.7-107.027 43.785L493.77 158.7v-30.58L339.297 328.19c1.19-51.24 16.946-114.427 39.156-171.047-17.383 25.054-33.876 46.073-49.713 62.742l56.406-202.668h-19.398l-53.412 191.906 3.832-192.834h-119.79z"
            fill={active ? "#f5f5f5" : "#6b6b6b"}
        />
    </svg>
);

const TryOnIcon: React.FC<{ active?: boolean }> = ({ active }) => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 512.026 512.026"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <g>
            <path
                d="M417.758,108.407c-1.212-3.874-13.918-37.538-93.483-55.543V29.901v-5.41c0-8.124-5.794-14.916-13.901-16.427
                c-35.567-10.752-73.156-10.752-108.723,0c-8.107,1.51-13.909,8.303-13.909,16.427v5.41v22.963
                c-79.556,18.005-92.262,51.669-93.474,55.543c-0.657,2.108-0.469,4.386,0.512,6.366l14.242,28.493
                c12.425,24.841,18.987,52.651,18.987,80.427v262.733c0,14.114,11.486,25.6,25.6,25.6h93.867V68.292
                c0-0.094,0.051-0.162,0.051-0.247c-16.316-0.862-31.514-4.147-42.718-9.216V43.042c14.532,5.265,32.461,8.183,51.2,8.183
                c18.748,0,36.676-2.918,51.2-8.183v15.787c-11.196,5.069-26.394,8.354-42.709,9.216c0,0.085,0.043,0.154,0.043,0.247v443.733
                h93.867c14.123,0,25.6-11.486,25.6-25.6V223.693c0-27.776,6.571-55.586,18.995-80.427l14.242-28.493
                C418.227,112.794,418.415,110.515,417.758,108.407z M204.117,378.854l-25.6,59.733c-1.382,3.234-4.531,5.18-7.842,5.18
                c-1.118,0-2.261-0.23-3.354-0.7c-4.335-1.852-6.34-6.869-4.48-11.204l25.6-59.733c1.843-4.335,6.904-6.332,11.196-4.48
                C203.972,369.502,205.978,374.519,204.117,378.854z M307.209,24.602c-13.286,6.084-31.582,9.557-51.2,9.557
                c-19.439,0-37.598-3.405-50.859-9.395c0.316-0.06,0.64-0.119,0.947-0.205c32.666-9.984,67.166-9.984,99.831,0
                c0.085,0.017,0.179,0.026,0.256,0.026c0.341,0,0.683-0.162,1.024-0.094V24.602z M344.704,443.068
                c-1.092,0.469-2.236,0.7-3.362,0.7c-3.302,0-6.451-1.946-7.834-5.18l-25.6-59.733c-1.86-4.335,0.145-9.353,4.48-11.204
                c4.292-1.86,9.344,0.145,11.196,4.48l25.6,59.733C351.044,436.198,349.039,441.216,344.704,443.068z"
                fill={active ? "#f5f5f5" : "#6b6b6b"}
            />
        </g>
    </svg>
);

const ProfileIcon: React.FC<{ active?: boolean }> = ({ active }) => (
    <svg
        width="30"
        height="30"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M21 46V29C21 20 32 20 32 29V46M32 21C42 21 47 25 47 31C47 37 42 41 32 41"
            stroke={active ? "#f5f5f5" : "#6b6b6b"}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const UserProfileIcon: React.FC<{ active?: boolean; initial?: string }> = ({
    active,
    initial,
}) => (
    <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            active
                ? "bg-[#f5f5f5] text-[#0a0a0a]"
                : "bg-[#2a2a2a] text-[#a0a0a0]"
        }`}
    >
        {initial || "U"}
    </div>
);

export const BottomNav: React.FC<BottomNavProps> = ({
    activeNav,
    onNavClick,
    user,
    onSignIn,
    onLogout,
}) => {
    const [showProfileMenu, setShowProfileMenu] = useState(false);

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
                <div className="md:hidden fixed bottom-[calc(60px+env(safe-area-inset-bottom))] right-4 z-50 w-56 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-lg py-2">
                    <div className="px-4 py-3 border-b border-[#2a2a2a]">
                        <p className="text-sm font-medium text-[#f5f5f5]">
                            {user.name}
                        </p>
                        <p className="text-xs text-[#6b6b6b]">{user.email}</p>
                    </div>
                    <button
                        onClick={() => {
                            onLogout();
                            setShowProfileMenu(false);
                        }}
                        className="w-full min-h-[44px] text-left px-4 py-3 text-sm text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-[#f5f5f5] transition-colors"
                    >
                        Log Out
                    </button>
                </div>
            )}

            <nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
                <div className="flex items-center justify-around h-[60px]">
                    <button
                        onClick={() => onNavClick("Creators")}
                        className="flex flex-col items-center justify-center gap-1 min-w-[80px] min-h-[56px] active:scale-95 transition-transform"
                    >
                        <CreatorsIcon active={activeNav === "Creators"} />
                        <span
                            className={`text-xs font-medium ${
                                activeNav === "Creators"
                                    ? "text-[#f5f5f5]"
                                    : "text-[#6b6b6b]"
                            }`}
                        >
                            Create
                        </span>
                    </button>

                    <button
                        onClick={() => onNavClick("Try on")}
                        className="flex flex-col items-center justify-center gap-1 min-w-[80px] min-h-[56px] active:scale-95 transition-transform"
                    >
                        <TryOnIcon active={activeNav === "Try on"} />
                        <span
                            className={`text-xs font-medium ${
                                activeNav === "Try on"
                                    ? "text-[#f5f5f5]"
                                    : "text-[#6b6b6b]"
                            }`}
                        >
                            Changing room
                        </span>
                    </button>

                    <button
                        onClick={handleProfileClick}
                        className="flex flex-col items-center justify-center gap-1 min-w-[80px] min-h-[56px] active:scale-95 transition-transform"
                    >
                        {user ? (
                            <UserProfileIcon
                                active={showProfileMenu}
                                initial={user.name?.charAt(0)?.toUpperCase()}
                            />
                        ) : (
                            <ProfileIcon active={false} />
                        )}
                        <span
                            className={`text-xs font-medium ${
                                showProfileMenu
                                    ? "text-[#f5f5f5]"
                                    : "text-[#6b6b6b]"
                            }`}
                        >
                            {user ? "Profile" : "Sign In"}
                        </span>
                    </button>
                </div>
            </nav>
        </>
    );
};
