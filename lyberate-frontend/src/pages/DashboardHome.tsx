import { useState, useMemo, useEffect } from 'react';
import { Users, Receipt, Wallet, Globe, CalendarCheck, TrendingUp, Plus, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSales, getPayments, Sale, Payment, getWeeklyPeriods } from '../services/apiService';

import { WeekSelector } from '../components/WeekSelector';

const StatCard = ({ title, value, icon: Icon, color, sub }: { title: string; value: string; icon: React.ElementType; color: string; sub?: string }) => (
    <div className="glass-panel p-4 rounded-2xl flex flex-col gap-2 relative overflow-hidden group hover:shadow-md transition-all duration-300 border border-black/5 dark:border-white/5">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-ios-subtext font-bold text-[10px] tracking-widest uppercase mb-1">{title}</p>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">{value}</h3>
                {sub && <p className={`text-[10px] font-semibold mt-1 ${sub.includes('Pérdida') || sub.includes('debe') ? 'text-red-500' : 'text-ios-green'}`}>{sub}</p>}
            </div>
            <div className={`p-2.5 rounded-xl ${color} bg-opacity-10`}>
                <Icon size={18} className={color.replace('bg-', 'text-')} />
            </div>
        </div>
    </div>
);

const QuickActionBtn = ({ icon: Icon, label, sub, color, onClick }: { icon: React.ElementType; label: string; sub: string; color: 'ios-blue' | 'ios-green' | 'ios-red'; onClick: () => void }) => {
    const variants = {
        'ios-blue': { gradient: 'from-ios-blue to-blue-600', hoverBorder: 'hover:border-ios-blue/30', hoverBg: 'hover:bg-ios-blue/5', groupHoverText: 'group-hover:text-ios-blue' },
        'ios-green': { gradient: 'from-ios-green to-emerald-600', hoverBorder: 'hover:border-ios-green/30', hoverBg: 'hover:bg-ios-green/5', groupHoverText: 'group-hover:text-ios-green' },
        'ios-red': { gradient: 'from-ios-red to-rose-600', hoverBorder: 'hover:border-ios-red/30', hoverBg: 'hover:bg-ios-red/5', groupHoverText: 'group-hover:text-ios-red' },
    };
    const v = variants[color] || variants['ios-blue'];

    return (
        <button onClick={onClick} className={`flex items-center gap-4 p-4 glass-panel rounded-2xl border border-black/5 dark:border-white/5 ${v.hoverBorder} ${v.hoverBg} shadow-sm hover:shadow-md transition-all duration-300 group w-full text-left`}>
            <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center text-white flex-shrink-0 bg-gradient-to-br ${v.gradient} shadow-md`}>
                <Icon size={22} />
            </div>
            <div>
                <p className={`font-bold text-sm text-ios-text ${v.groupHoverText} transition-colors`}>{label}</p>
                <p className="text-xs text-ios-subtext mt-0.5">{sub}</p>
            </div>
            <svg className="ml-auto text-ios-subtext opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
        </button>
    );
};

export const DashboardHome = () => {
    const navigate = useNavigate();

    const [sales, setSales] = useState<Sale[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');

    useEffect(() => {
        const load = async () => {
            const [s, p] = await Promise.all([getSales(), getPayments()]);
            setSales(s);
            setPayments(p);
        };
        load();
    }, []);

    const weeklyPeriods = useMemo(() => {
        const dates = [
            ...sales.map(s => s.date),
            ...payments.map(p => p.date)
        ].filter(Boolean);
        return getWeeklyPeriods(dates);
    }, [sales, payments]);

    useEffect(() => {
        if (weeklyPeriods.length > 0 && !selectedPeriodId) {
            setSelectedPeriodId(weeklyPeriods[0].id);
        }
    }, [weeklyPeriods]);

    const filteredSales = useMemo(() => {
        const period = weeklyPeriods.find(p => p.id === selectedPeriodId);
        if (!period) return [];
        return sales.filter(s => {
            const d = new Date(s.date + 'T12:00:00');
            return d >= period.startDate && d <= period.endDate;
        });
    }, [sales, selectedPeriodId, weeklyPeriods]);

    const filteredPayments = useMemo(() => {
        const period = weeklyPeriods.find(p => p.id === selectedPeriodId);
        if (!period) return [];
        return payments.filter(p => {
            const d = new Date(p.date + 'T12:00:00');
            return d >= period.startDate && d <= period.endDate;
        });
    }, [payments, selectedPeriodId, weeklyPeriods]);

    const kpis = useMemo(() => {
        const createBucket = () => ({ sales: 0, prize: 0, commission: 0, netBank: 0, collected: 0, pending: 0, symbol: '' });
        const totals = { usd: createBucket(), bs: createBucket(), cop: createBucket() };
        totals.usd.symbol = '$';
        totals.bs.symbol = 'Bs.';
        totals.cop.symbol = 'COP';

        filteredSales.forEach(s => {
            const lower = s.currencyName.toLowerCase();
            const bucket = (lower.includes('dolar') || lower.includes('usd')) ? totals.usd
                : (lower.includes('peso') || lower.includes('cop')) ? totals.cop
                    : totals.bs;
            bucket.sales += s.amount;
            bucket.prize += s.prize;
            bucket.commission += s.commission;
            bucket.netBank += s.totalBank;
        });

        filteredPayments.forEach(p => {
            const lower = p.currency.toLowerCase();
            const bucket = (lower.includes('dolar') || lower.includes('usd')) ? totals.usd
                : (lower.includes('peso') || lower.includes('cop')) ? totals.cop
                    : totals.bs;
            if (p.status === 'approved') bucket.collected += p.amount;
        });

        const bsKeys = ['usd', 'bs', 'cop'] as const;
        bsKeys.forEach(k => {
            totals[k].pending = totals[k].netBank - totals[k].collected;
        });

        return totals;
    }, [filteredSales, filteredPayments]);

    const fmt = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const hasData = kpis.usd.sales > 0 || kpis.bs.sales > 0 || kpis.cop.sales > 0;

    const renderCurrencyBlock = (label: string, color: string, sym: string, data: { sales: number; prize: number; commission: number; netBank: number; collected: number; pending: number }) => (
        <div className="space-y-4">
            <div className={`flex items-center gap-2 ${color} mb-3 pl-2`}>
                <Globe size={18} />
                <h2 className="font-bold uppercase tracking-widest text-[13px]">{label}</h2>
            </div>
            {/* Fila 1: Stats Operativos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard title="Venta Bruta" value={`${sym}${fmt(data.sales)}`} icon={TrendingUp} color="bg-ios-blue" />
                <StatCard title="Premios" value={`${sym}${fmt(data.prize)}`} icon={Wallet} color="bg-orange-500" />
                <StatCard title="Comisiones" value={`${sym}${fmt(data.commission)}`} icon={Users} color="bg-yellow-500" />
                <StatCard title="Utilidad Banca" value={`${sym}${fmt(data.netBank)}`} icon={Receipt} color={data.netBank < 0 ? "bg-red-500" : "bg-ios-green"} sub={data.netBank < 0 ? 'Pérdida (Premios > Venta)' : 'Ganancia Neta'} />
            </div>
            {/* Fila 2: Liquidación/Balance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="glass-panel p-4 rounded-2xl flex justify-between items-center border border-black/5 dark:border-white/5 border-l-4 border-l-ios-green shadow-sm">
                    <div>
                        <p className="text-[10px] text-ios-subtext font-bold tracking-widest uppercase">Recaudado (Físico en Caja)</p>
                        <h4 className="text-xl font-black text-ios-green mt-1">{sym} {fmt(data.collected)}</h4>
                    </div>
                </div>
                <div className={`glass-panel p-4 rounded-2xl flex justify-between items-center border border-black/5 dark:border-white/5 border-l-4 shadow-sm ${data.pending < 0 ? 'border-l-red-500' : 'border-l-orange-500'}`}>
                    <div>
                        <p className="text-[10px] text-ios-subtext font-bold tracking-widest uppercase">Balance Dinámico</p>
                        <h4 className={`text-xl font-black mt-1 ${data.pending < 0 ? 'text-red-500' : 'text-ios-text'}`}>
                            {data.pending < 0 ? `Banca debe pagar ${sym} ${fmt(Math.abs(data.pending))}` : `Vendedores deben ${sym} ${fmt(data.pending)}`}
                        </h4>
                    </div>
                    <div><Activity size={24} className={data.pending < 0 ? 'text-red-500 opacity-20' : 'text-ios-text opacity-20'} /></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-slide-up pb-safe">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-ios-text">Panel de Control</h1>
                    <p className="text-ios-subtext mt-1 text-sm font-medium">Estadísticas avanzadas por semana fiscal.</p>
                </div>
                {/* Selector de Semana Avanzado */}
                <WeekSelector periods={weeklyPeriods} selectedId={selectedPeriodId} onSelect={setSelectedPeriodId} />
            </div>

            {/* Accesos Rápidos (Moved to top for better workflow) */}
            <div>
                <h2 className="font-bold text-xs uppercase tracking-widest text-ios-subtext mb-3 pl-1 flex items-center gap-2"><Plus size={14} /> Accesos Rápidos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <QuickActionBtn icon={TrendingUp} label="Nueva Venta" sub="Registrar ventas semanales" color="ios-blue" onClick={() => navigate('/sales')} />
                    <QuickActionBtn icon={Receipt} label="Recaudación" sub="Registrar o aprobar cobros" color="ios-green" onClick={() => navigate('/collections')} />
                    <QuickActionBtn icon={CalendarCheck} label="Cierre Semanal" sub="Liquidar tickets" color="ios-blue" onClick={() => navigate('/weekly-closing')} />
                </div>
            </div>

            {/* KPIs Block */}
            <div>
                <h2 className="font-bold text-xs uppercase tracking-widest text-ios-subtext mb-3 pl-1 flex items-center gap-2"><Activity size={14} /> Estado Financiero</h2>
                {hasData ? (
                    <div className="space-y-6">
                        {kpis.usd.sales > 0 && renderCurrencyBlock('Moneda USD ($)', 'text-green-600 dark:text-green-500', '$', kpis.usd)}
                        {kpis.bs.sales > 0 && (
                            <div className="pt-4 border-t border-black/5 dark:border-white/5">
                                {renderCurrencyBlock('Moneda Bs. (VES)', 'text-blue-600 dark:text-blue-500', 'Bs. ', kpis.bs)}
                            </div>
                        )}
                        {kpis.cop.sales > 0 && (
                            <div className="pt-4 border-t border-black/5 dark:border-white/5">
                                {renderCurrencyBlock('Moneda COP', 'text-yellow-600 dark:text-yellow-500', 'COP ', kpis.cop)}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="glass-panel p-10 rounded-2xl text-center text-ios-subtext border border-black/5 dark:border-white/5 shadow-sm">
                        <Activity size={32} className="mx-auto mb-3 opacity-20" />
                        <p className="font-semibold text-ios-text">Ausencia de movimientos.</p>
                        <p className="text-sm mt-1">Registra una venta o cobro para visualizar los indicadores de la red aquí.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
