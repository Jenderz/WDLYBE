import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Bell, LogOut } from 'lucide-react';
import { ADMIN_MENU_ITEMS } from '../config/menu';
import { useAuth } from '../context/AuthContext';

export const DashboardLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const { user, logout } = useAuth();

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <div className="flex h-screen w-full bg-ios-bg dark:bg-black overflow-hidden relative">

            {/* --- SIDEBAR (Desktop) / DRAWER (Mobile) --- */}
            <aside
                className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    } md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-72 transition-transform duration-300 ease-in-out`}
            >
                {/* Glassmorphism Panel */}
                <div className="h-full w-full glass-panel dark:bg-black/80 flex flex-col md:border-r border-black/5 dark:border-white/10 shadow-glass">

                    {/* Logo Area */}
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img
                                src="https://orgemac.com/api/uploads/img_1767849584_a1254615.png"
                                alt="Lyberate Logo"
                                className="w-10 h-10 object-contain drop-shadow-md"
                            />
                            <div>
                                <h1 className="font-bold text-lg tracking-tight">Lyberate</h1>
                                <p className="text-[10px] text-ios-subtext uppercase tracking-widest font-semibold">Admin Panel</p>
                            </div>
                        </div>
                        {/* Close Button on Mobile */}
                        <button onClick={closeMobileMenu} className="md:hidden p-2 text-ios-subtext hover:text-ios-text">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Navigation Menu */}
                    <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-2 space-y-1">
                        {ADMIN_MENU_ITEMS.map((item, index) => {
                            if (item.isSeparator) {
                                return <div key={`sep-${index}`} className="my-4 border-t border-black/5 dark:border-white/5 mx-2"></div>;
                            }

                            const Icon = item.icon;
                            if (!Icon || !item.path) return null;

                            const isActive = location.pathname.startsWith(item.path);

                            return (
                                <NavLink
                                    key={item.id}
                                    to={item.path}
                                    onClick={closeMobileMenu}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                            ? 'bg-ios-blue text-white shadow-md font-semibold'
                                            : 'text-ios-text/80 hover:bg-black/5 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <Icon size={20} className={isActive ? 'opacity-100' : 'opacity-70'} />
                                    <span className="text-sm">{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </div>

                    {/* User Profile Mini */}
                    <div className="p-4 mt-auto">
                        <div
                            onClick={logout}
                            className="flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-ios-red/10 group transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-ios-blue/10 group-hover:bg-ios-red/20 flex items-center justify-center text-ios-blue group-hover:text-ios-red transition-colors">
                                <LogOut size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate group-hover:text-ios-red transition-colors">{user?.name || 'Usuario'}</p>
                                <p className="text-xs text-ios-subtext truncate group-hover:text-ios-red/70">{user?.role || 'Vendedor'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* --- OVERLAY FOR MOBILE --- */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden animate-fade-in"
                    onClick={closeMobileMenu}
                />
            )}

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">

                {/* Top Header */}
                <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 glass-panel md:bg-transparent md:backdrop-filter-none md:border-none z-30 sticky top-0">
                    <div className="flex items-center">
                        <button
                            onClick={toggleMobileMenu}
                            className="md:hidden p-2 mr-4 text-ios-text bg-white dark:bg-black/50 rounded-lg shadow-sm"
                        >
                            <Menu size={20} />
                        </button>
                        <h2 className="text-xl font-bold hidden md:block">Panel de Control</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-ios-subtext hover:text-ios-text transition-colors">
                            <Bell size={22} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-ios-red rounded-full shadow-sm"></span>
                        </button>
                    </div>
                </header>

                {/* Scrollable Page Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto pb-safe">
                        {/* Animación base para las vistas hijas */}
                        <div className="animate-fade-in">
                            <Outlet />
                        </div>
                    </div>
                </div>
            </main>

        </div>
    );
};
