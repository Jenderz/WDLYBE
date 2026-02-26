import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardHome } from './pages/DashboardHome';
import { Collections } from './pages/Collections';
import { Sales } from './pages/Sales';
import { Products } from './pages/Products';
import { Sellers } from './pages/Sellers';
import { Agencies } from './pages/Agencies';
import { Expenses } from './pages/Expenses';
import { Login } from './pages/Login';
import { VendorPortal } from './pages/VendorPortal';
import { WeeklyClosing } from './pages/WeeklyClosing';

// Preloader Genérico "Tecnología Lyberate"
const GenericPreloader = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-50 dark:bg-black transition-colors duration-500">
            <div className="flex flex-col items-center gap-8 animate-fade-in p-6">
                <div className="relative w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 border-2 border-gray-100 dark:border-white/5 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-ios-blue border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center p-5">
                        <img
                            src="https://orgemac.com/api/uploads/img_1767849584_a1254615.png"
                            alt="Lyberate"
                            className="w-full h-full object-contain opacity-90"
                        />
                    </div>
                </div>
                <div className="text-center space-y-4">
                    <h1 className="text-xs md:text-sm font-light text-gray-500 dark:text-gray-400 tracking-[0.4em] uppercase">
                        Tecnología Lyberate
                    </h1>
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
            <img src="https://orgemac.com/api/uploads/img_1767849584_a1254615.png" alt="Lyberate" className="w-16 h-16 opacity-50 grayscale" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Módulo: {title}</h2>
        <p className="text-ios-subtext text-center max-w-md">
            Este módulo forma parte de la arquitectura Financiera Lyberate y está en proceso de construcción.
        </p>
    </div>
);

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // Redirect Vendedores to their portal instead of admin dashboard
        return <Navigate to={user.role === 'Vendedor' ? '/portal' : '/dashboard'} replace />;
    }

    return <>{children}</>;
};

const AppContent = () => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulación de carga inicial (Fetch de Rates/Session)
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return <GenericPreloader />;
    }

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                {/* Rutas Protegidas con el Dashboard Layout */}
                <Route path="/" element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardHome />} />

                    {/* Rutas Restringidas por Rol (Ejemplo Admin/Supervisor) */}
                    <Route path="sales" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor']}><Sales /></ProtectedRoute>} />
                    <Route path="collections" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor', 'Banca']}><Collections /></ProtectedRoute>} />
                    <Route path="expenses" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor']}><Expenses /></ProtectedRoute>} />
                    <Route path="products" element={<ProtectedRoute allowedRoles={['Admin']}><Products /></ProtectedRoute>} />
                    <Route path="sellers" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor']}><Sellers /></ProtectedRoute>} />
                    <Route path="agencies" element={<ProtectedRoute allowedRoles={['Admin']}><Agencies /></ProtectedRoute>} />
                    <Route path="weekly-closing" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor']}><WeeklyClosing /></ProtectedRoute>} />
                    <Route path="reports" element={<UnderConstruction title="Reportes" />} />
                    <Route path="audits" element={<UnderConstruction title="Auditorías" />} />
                    <Route path="settings" element={<UnderConstruction title="Configuración" />} />
                </Route>

                {/* Vendor Portal (separate from admin layout) */}
                <Route path="/portal" element={
                    <ProtectedRoute allowedRoles={['Vendedor']}>
                        <VendorPortal />
                    </ProtectedRoute>
                } />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
