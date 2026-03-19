import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardHome } from './pages/DashboardHome';
import { Collections } from './pages/Collections';
import { Sales } from './pages/Sales';

import { Sellers } from './pages/Sellers';
import { Agencies } from './pages/Agencies';
import { Expenses } from './pages/Expenses';
import { Login } from './pages/Login';
import { VendorPortal } from './pages/VendorPortal';
import { WeeklyClosing } from './pages/WeeklyClosing';
import { Settings } from './pages/Settings';

// Preloader Genérico "Tecnología WORLD DEPORTES"
const GenericPreloader = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-50 dark:bg-black transition-colors duration-500">
            <div className="flex flex-col items-center gap-8 animate-fade-in p-6">

                {/* Animación de Carga Central Minimalista */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                    {/* Anillo exterior sutil */}
                    <div className="absolute inset-0 border-2 border-gray-100 dark:border-white/5 rounded-full"></div>
                    {/* Anillo de carga fino */}
                    <div className="absolute inset-0 border-2 border-ios-blue border-t-transparent rounded-full animate-spin"></div>
                    {/* Logo Central */}
                    <div className="absolute inset-0 flex items-center justify-center p-5">
                        <img
                            src="https://orgemac.com/api/uploads/img_1767849584_a1254615.png"
                            alt="World Deportes"
                            className="w-16 h-16 object-contain"
                        /></div>
                </div>

                {/* Texto de Marca Minimalista */}
                <div className="text-center space-y-4">
                    <div className="text-center mt-6 text-sm text-gray-500 font-medium">
                        World Deportes
                    </div>
                    {/* Puntos de carga sutiles */}
                    <div className="flex justify-center gap-1.5 opacity-30">
                        <span className="w-0.5 h-0.5 bg-gray-400 dark:bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-0.5 h-0.5 bg-gray-400 dark:bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-0.5 h-0.5 bg-gray-400 dark:bg-white rounded-full animate-bounce"></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Componente Placeholder para rutas en construcción
const UnderConstruction = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] animate-fade-in">
        <div className="bg-ios-blue/10 p-6 rounded-full mb-6">
            <img src="https://freanpartners.com/upload/logoworlddeportes.webp" alt="WORLD DEPORTES" className="w-20 h-20 opacity-50 grayscale object-contain" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Módulo: {title}</h2>
        <p className="text-ios-subtext text-center max-w-md">
            Este módulo forma parte de la arquitectura Financiera WORLD DEPORTES y está en proceso de construcción.
        </p>
    </div>
);

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
    const { isAuthenticated, user, loading } = useAuth();

    // Mientras se restaura la sesión, no redirigir todavía
    if (loading) return null;

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // Redirigir al vendedor a su portal; otros roles al dashboard
        return <Navigate to={user.role === 'Vendedor' ? '/portal' : '/dashboard'} replace />;
    }

    return <>{children}</>;
};

// Redirige al usuario a la ruta correcta según su rol
const RoleBasedFallback = () => {
    const { user, isAuthenticated, loading } = useAuth();
    if (loading) return null;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <Navigate to={user?.role === 'Vendedor' ? '/portal' : '/dashboard'} replace />;
};

const AppContent = () => {
    const { loading } = useAuth();

    if (loading) {
        return <GenericPreloader />;
    }

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                {/* Rutas Protegidas con el Dashboard Layout */}
                {/* Rutas del Panel Admin — bloqueadas para Vendedor */}
                <Route path="/" element={
                    <ProtectedRoute allowedRoles={['Admin', 'Supervisor', 'Banca']}>
                        <DashboardLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardHome />} />

                    {/* Rutas Restringidas por Rol (Ejemplo Admin/Supervisor) */}
                    <Route path="sales" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor']}><Sales /></ProtectedRoute>} />
                    <Route path="collections" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor', 'Banca']}><Collections /></ProtectedRoute>} />
                    <Route path="expenses" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor']}><Expenses /></ProtectedRoute>} />

                    <Route path="sellers" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor']}><Sellers /></ProtectedRoute>} />
                    <Route path="agencies" element={<ProtectedRoute allowedRoles={['Admin']}><Agencies /></ProtectedRoute>} />
                    <Route path="weekly-closing" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor']}><WeeklyClosing /></ProtectedRoute>} />
                    <Route path="settings" element={<ProtectedRoute allowedRoles={['Admin']}><Settings /></ProtectedRoute>} />
                    <Route path="reports" element={<UnderConstruction title="Reportes" />} />
                    <Route path="audits" element={<UnderConstruction title="Auditorías" />} />
                </Route>

                {/* Vendor Portal (separate from admin layout) */}
                <Route path="/portal" element={
                    <ProtectedRoute allowedRoles={['Vendedor']}>
                        <VendorPortal />
                    </ProtectedRoute>
                } />

                {/* Fallback — redirigir según rol */}
                <Route path="*" element={<RoleBasedFallback />} />
            </Routes>
        </Router>
    );
};

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
