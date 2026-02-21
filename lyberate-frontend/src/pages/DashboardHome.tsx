import { Package, Users, Store, Receipt, Wallet, Banknote, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Tarjeta de Estadística Estilo iOS
const StatCard = ({ title, value, icon: Icon, trend, trendValue, colorClass }: any) => (
    <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-ios-subtext font-semibold text-xs tracking-wider uppercase mb-1">{title}</p>
                <h3 className="text-2xl font-bold">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
                <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
            </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-ios-green/10 text-ios-green' : 'bg-ios-red/10 text-ios-red'
                }`}>
                {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {trendValue}
            </div>
            <span className="text-xs text-ios-subtext font-medium">vs. semana anterior</span>
        </div>
    </div>
);

// Módulo Rápido (Accesos Directos estilo iconos de App)
const QuickModule = ({ title, icon: Icon, color, onClick }: any) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center gap-3 p-4 rounded-2xl glass-panel hover:bg-black/5 dark:hover:bg-white/5 transition-all outline-none"
    >
        <div className="w-14 h-14 rounded-2xl shadow-sm flex items-center justify-center text-white bg-gradient-to-br" style={{ backgroundImage: color }}>
            <Icon size={28} />
        </div>
        <span className="text-xs font-bold text-center leading-tight">{title}</span>
    </button>
);

export const DashboardHome = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-8 animate-slide-up">

            {/* Header de Bienvenida */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Buenas tardes, Admin.</h1>
                <p className="text-ios-subtext mt-1 text-sm">Resumen financiero de hoy, calculado en tiempo real.</p>
            </div>

            {/* Billetera Dual Preview (KPIs Principales) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Ventas Totales"
                    value="$12,450.00"
                    icon={Receipt}
                    trend="up"
                    trendValue="12.5%"
                    colorClass="bg-ios-blue"
                />
                <StatCard
                    title="Recaudación (Cobrado)"
                    value="$8,230.50"
                    icon={Wallet}
                    trend="up"
                    trendValue="8.2%"
                    colorClass="bg-ios-green"
                />
                <StatCard
                    title="Cuentas por Cobrar"
                    value="$4,219.50"
                    icon={Users}
                    trend="down"
                    trendValue="2.4%"
                    colorClass="bg-orange-500"
                />
                <StatCard
                    title="Gastos Operativos"
                    value="$1,150.00"
                    icon={Banknote}
                    trend="up"
                    trendValue="5.1%"
                    colorClass="bg-ios-red"
                />
            </div>

            {/* Accesos Rápidos a Módulos Core */}
            <div>
                <h2 className="text-lg font-bold mb-4">Módulos Principales</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    <QuickModule
                        title="Ventas"
                        icon={Receipt}
                        color="linear-gradient(135deg, #007AFF 0%, #0056b3 100%)"
                        onClick={() => navigate('/sales')}
                    />
                    <QuickModule
                        title="Recaudación"
                        icon={Wallet}
                        color="linear-gradient(135deg, #34C759 0%, #248a3d 100%)"
                        onClick={() => navigate('/collections')}
                    />
                    <QuickModule
                        title="Gastos Op."
                        icon={Banknote}
                        color="linear-gradient(135deg, #FF3B30 0%, #b32a22 100%)"
                        onClick={() => navigate('/expenses')}
                    />
                    <QuickModule
                        title="Productos"
                        icon={Package}
                        color="linear-gradient(135deg, #AF52DE 0%, #7a3a9b 100%)"
                        onClick={() => navigate('/products')}
                    />
                    <QuickModule
                        title="Vendedores"
                        icon={Users}
                        color="linear-gradient(135deg, #FF9500 0%, #b36800 100%)"
                        onClick={() => navigate('/sellers')}
                    />
                    <QuickModule
                        title="Agencias"
                        icon={Store}
                        color="linear-gradient(135deg, #5856D6 0%, #3e3c96 100%)"
                        onClick={() => navigate('/agencies')}
                    />
                </div>
            </div>

            {/* Sección temporal para demostrar la arquitectura multi-moneda futura */}
            <div className="glass-panel p-6 rounded-3xl mt-8 border-l-4 border-l-ios-blue">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-lg">Integración Multi-Moneda Activa</h3>
                        <p className="text-sm text-ios-subtext mt-1 max-w-xl">
                            Las transacciones mostradas están normalizadas en USD. El sistema inyectará la tasa del BCV y Paralelo
                            en las facturas al momento del registro para proteger los cierres de semanas pasadas.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-black/5 dark:bg-white/5 px-4 py-2 rounded-xl text-center">
                            <p className="text-[10px] uppercase font-bold text-ios-subtext">Tasa BCV</p>
                            <p className="font-bold">48.25 VES</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};
