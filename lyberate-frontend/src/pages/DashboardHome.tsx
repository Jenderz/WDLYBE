import { useState, useMemo, useEffect } from 'react';
import { Users, Receipt, Wallet, Globe, CalendarCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSales, getPayments, Sale, Payment } from '../services/localStore';

// Tarjeta de Estadística Estilo iOS
const StatCard = ({ title, value, icon: Icon, colorClass, currencySign }: any) => (
    <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-ios-subtext font-semibold text-[10px] tracking-widest uppercase mb-1">{title}</p>
                <div className="flex items-baseline gap-1">
                    {currencySign && <span className="text-sm font-bold text-ios-subtext">{currencySign}</span>}
                    <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
                </div>
            </div>
            <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
                <Icon size={20} className={colorClass.replace('bg-', 'text-')} />
            </div>
        </div>
    </div>
);


export const DashboardHome = () => {
    const navigate = useNavigate();
    const [sales, setSales] = useState<Sale[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);

    useEffect(() => {
        setSales(getSales());
        setPayments(getPayments());
    }, []);

    // Aggregate Multi-currency KPIs
    const kpis = useMemo(() => {
        const totals = {
            usd: { sales: 0, collected: 0, pending: 0, symbol: '$' },
            bs: { sales: 0, collected: 0, pending: 0, symbol: 'Bs.' },
            cop: { sales: 0, collected: 0, pending: 0, symbol: 'COP' }
        };

        // Calculate total expected from BANK for each currency from Sales
        sales.forEach(s => {
            const lower = s.currencyName.toLowerCase();
            if (lower.includes('dolar') || lower.includes('usd')) {
                totals.usd.sales += s.totalBank;
            } else if (lower.includes('peso') || lower.includes('cop')) {
                totals.cop.sales += s.totalBank;
            } else {
                totals.bs.sales += s.totalBank;
            }
        });

        // Calculate Collected vs Pending from Payments
        payments.forEach(p => {
            const lower = p.currency.toLowerCase();
            const bucket = (lower.includes('dolar') || lower.includes('usd')) ? totals.usd :
                (lower.includes('peso') || lower.includes('cop')) ? totals.cop :
                    totals.bs;

            if (p.status === 'approved') {
                bucket.collected += p.amount;
            }
        });

        // Pending = Total Bank Sales expected - Collected Payments
        totals.usd.pending = totals.usd.sales - totals.usd.collected;
        totals.bs.pending = totals.bs.sales - totals.bs.collected;
        totals.cop.pending = totals.cop.sales - totals.cop.collected;

        return totals;
    }, [sales, payments]);

    // Helper string formatter
    const fmt = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });


    return (
        <div className="space-y-8 animate-slide-up pb-safe">

            {/* Header de Bienvenida */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Inicio</h1>
                <p className="text-ios-subtext mt-1 text-sm">Resumen financiero consolidado por moneda en tiempo real.</p>
            </div>

            {/* KPIs Dólar */}
            {kpis.usd.sales > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-500 mb-2 pl-2">
                        <Globe size={18} />
                        <h2 className="font-bold uppercase tracking-widest text-sm">Moneda USD ($)</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard title="Ventas a Cobrar (Banco)" value={fmt(kpis.usd.sales)} currencySign="$" icon={Receipt} colorClass="bg-ios-blue" />
                        <StatCard title="Recaudado (Aprobado)" value={fmt(kpis.usd.collected)} currencySign="$" icon={Wallet} colorClass="bg-ios-green" />
                        <StatCard title="Cuentas por Cobrar" value={fmt(kpis.usd.pending)} currencySign="$" icon={Users} colorClass="bg-orange-500" />
                    </div>
                </div>
            )}

            {/* KPIs Bolívares */}
            {kpis.bs.sales > 0 && (
                <div className="space-y-3 pt-4 border-t border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-500 mb-2 pl-2">
                        <Globe size={18} />
                        <h2 className="font-bold uppercase tracking-widest text-sm">Moneda Bs. (VES)</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard title="Ventas a Cobrar (Banco)" value={fmt(kpis.bs.sales)} currencySign="Bs." icon={Receipt} colorClass="bg-blue-600" />
                        <StatCard title="Recaudado (Aprobado)" value={fmt(kpis.bs.collected)} currencySign="Bs." icon={Wallet} colorClass="bg-ios-green" />
                        <StatCard title="Cuentas por Cobrar" value={fmt(kpis.bs.pending)} currencySign="Bs." icon={Users} colorClass="bg-orange-500" />
                    </div>
                </div>
            )}

            {/* KPIs COP */}
            {kpis.cop.sales > 0 && (
                <div className="space-y-3 pt-4 border-t border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 mb-2 pl-2">
                        <Globe size={18} />
                        <h2 className="font-bold uppercase tracking-widest text-sm">Moneda COP</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard title="Ventas a Cobrar (Banco)" value={fmt(kpis.cop.sales)} currencySign="COP" icon={Receipt} colorClass="bg-yellow-600" />
                        <StatCard title="Recaudado (Aprobado)" value={fmt(kpis.cop.collected)} currencySign="COP" icon={Wallet} colorClass="bg-ios-green" />
                        <StatCard title="Cuentas por Cobrar" value={fmt(kpis.cop.pending)} currencySign="COP" icon={Users} colorClass="bg-orange-500" />
                    </div>
                </div>
            )}

            {(kpis.usd.sales === 0 && kpis.bs.sales === 0 && kpis.cop.sales === 0) && (
                <div className="glass-panel p-10 rounded-2xl text-center text-ios-subtext">
                    <p className="font-medium">No hay ventas registradas todavía.</p>
                    <p className="text-sm mt-1">Ingresa al módulo de ventas para comenzar la facturación.</p>
                </div>
            )}

            {/* Acceso rápido: Cierre Semanal */}
            <button
                onClick={() => navigate('/weekly-closing')}
                className="w-full flex items-center gap-4 p-5 glass-panel rounded-2xl border border-ios-blue/20 hover:border-ios-blue/50 hover:bg-ios-blue/5 transition-all group"
            >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #30B0C7 0%, #1a7a8c 100%)' }}>
                    <CalendarCheck size={24} />
                </div>
                <div className="text-left">
                    <p className="font-bold text-sm group-hover:text-ios-blue transition-colors">Cierre Semanal</p>
                    <p className="text-xs text-ios-subtext mt-0.5">Generar tickets, liquidar semanas y ver balances por vendedor</p>
                </div>
                <div className="ml-auto text-ios-subtext group-hover:text-ios-blue transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                </div>
            </button>

        </div>
    );
};
