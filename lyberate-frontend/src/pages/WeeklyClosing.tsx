import { useState, useMemo, useEffect } from 'react';
import {
    CalendarCheck, ChevronDown, ChevronUp, Receipt,
    CheckCircle2, Clock, AlertCircle, Building2
} from 'lucide-react';
import {
    getSales, getPayments, getSellers,
    upsertWeeklyTicket, getWeeklyTickets, updateWeeklyTicketStatus,
    Seller, WeeklyTicket
} from '../services/localStore';

// ─── Helper: generar períodos semanales (Lun → Dom) ──────────────────────────
const generateWeeklyPeriods = (count = 8) => {
    const periods = [];
    const today = new Date();
    let currentMonday = new Date(today);
    const day = currentMonday.getDay();
    const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
    currentMonday.setDate(diff);
    currentMonday.setHours(0, 0, 0, 0);

    for (let i = 0; i < count; i++) {
        const startDate = new Date(currentMonday);
        startDate.setDate(startDate.getDate() - i * 7);
        // Domingo = lunes + 6 días
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        const startStr = startDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        const endStr = endDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        periods.push({ id: `week-${i}`, label: `Lun ${startStr} — Dom ${endStr}`, startDate, endDate });
    }
    return periods;
};

// ─── Badge de status ──────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: WeeklyTicket['status'] }) => {
    const map = {
        open: { label: 'Abierta', icon: Clock, cls: 'bg-orange-500/10 text-orange-500' },
        pending: { label: 'Pendiente', icon: AlertCircle, cls: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
        settled: { label: 'Liquidada', icon: CheckCircle2, cls: 'bg-ios-green/10 text-ios-green' },
    };
    const { label, icon: Icon, cls } = map[status];
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${cls}`}>
            <Icon size={11} /> {label}
        </span>
    );
};

// ─── Tipo fila del reporte ────────────────────────────────────────────────────
type SellerRow = {
    sellerId: string;
    sellerName: string;
    currency: string;
    totalSales: number;
    totalPrize: number;
    totalCommission: number;
    totalNet: number;
    totalParticipation: number;
    totalVendor: number;
    totalBank: number;
    totalPaid: number;
    balance: number;
    agencyBreakdown: { agencyName: string; amount: number; totalBank: number }[];
};

// ─── Formateador ──────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Main Component ───────────────────────────────────────────────────────────
export const WeeklyClosing = () => {
    const weeklyPeriods = useMemo(() => generateWeeklyPeriods(), []);
    const [selectedPeriodId, setSelectedPeriodId] = useState(weeklyPeriods[0].id);
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [tickets, setTickets] = useState<WeeklyTicket[]>([]);
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const refreshAll = () => {
        setSellers(getSellers());
        setTickets(getWeeklyTickets());
    };

    useEffect(() => { refreshAll(); }, []);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    // ── Construcción del reporte ───────────────────────────────────────────────
    const report = useMemo(() => {
        const allSales = getSales().filter(s => s.weekId === selectedPeriodId);
        const allPayments = getPayments().filter(p => p.weekId === selectedPeriodId && p.status === 'approved');
        const selectedPeriod = weeklyPeriods.find(p => p.id === selectedPeriodId);

        const map = new Map<string, SellerRow>();

        allSales.forEach(sale => {
            const key = `${sale.sellerId}|${sale.currencyName}`;
            if (!map.has(key)) {
                map.set(key, {
                    sellerId: sale.sellerId,
                    sellerName: sale.sellerName,
                    currency: sale.currencyName,
                    totalSales: 0, totalPrize: 0, totalCommission: 0, totalNet: 0,
                    totalParticipation: 0, totalVendor: 0, totalBank: 0,
                    totalPaid: 0, balance: 0,
                    agencyBreakdown: [],
                });
            }
            const row = map.get(key)!;
            row.totalSales += sale.amount;
            row.totalPrize += sale.prize;
            row.totalCommission += sale.commission;
            row.totalNet += sale.total;
            row.totalParticipation += sale.participation;
            row.totalVendor += sale.totalVendor;
            row.totalBank += sale.totalBank;

            // Desglose por agencia (si está especificada)
            if (sale.agencyName) {
                const existing = row.agencyBreakdown.find(a => a.agencyName === sale.agencyName);
                if (existing) {
                    existing.amount += sale.amount;
                    existing.totalBank += sale.totalBank;
                } else {
                    row.agencyBreakdown.push({ agencyName: sale.agencyName, amount: sale.amount, totalBank: sale.totalBank });
                }
            }
        });

        // Sumar pagos aprobados
        allPayments.forEach(pay => {
            map.forEach((row, key) => {
                if (row.sellerId === pay.sellerId) {
                    row.totalPaid += pay.amount;
                }
            });
        });

        // Calcular balance
        map.forEach(row => {
            row.balance = row.totalBank - row.totalPaid;
        });

        return { rows: Array.from(map.values()), period: selectedPeriod };
    }, [selectedPeriodId, sellers]);

    // ── Generar ticket para un vendedor ───────────────────────────────────────
    const handleGenerateTicket = (row: SellerRow) => {
        const selectedPeriod = weeklyPeriods.find(p => p.id === selectedPeriodId);
        setGeneratingFor(row.sellerId + row.currency);
        upsertWeeklyTicket({
            sellerId: row.sellerId,
            sellerName: row.sellerName,
            weekId: selectedPeriodId,
            weekLabel: selectedPeriod?.label || '',
            totalSales: row.totalSales,
            totalPrize: row.totalPrize,
            totalCommission: row.totalCommission,
            totalNet: row.totalNet,
            totalParticipation: row.totalParticipation,
            totalVendor: row.totalVendor,
            totalBank: row.totalBank,
            totalPaid: row.totalPaid,
            balance: row.balance,
            currency: row.currency,
            status: row.balance <= 0 ? 'settled' : 'pending',
        });
        setTimeout(() => {
            setGeneratingFor(null);
            refreshAll();
            showToast(`✅ Ticket generado para ${row.sellerName}`);
        }, 600);
    };

    // ── Ticket existente para esta semana ─────────────────────────────────────
    const getExistingTicket = (sellerId: string, currency: string) =>
        tickets.find(t => t.sellerId === sellerId && t.weekId === selectedPeriodId && t.currency === currency);

    return (
        <div className="space-y-6 animate-fade-in pb-safe">

            {/* Toast */}
            {toast && (
                <div className="fixed top-5 right-5 z-50 bg-ios-green text-white px-4 py-3 rounded-2xl shadow-xl font-semibold text-sm animate-fade-in flex items-center gap-2">
                    <CheckCircle2 size={16} /> {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <CalendarCheck size={22} className="text-ios-blue" /> Cierre Semanal
                    </h1>
                    <p className="text-ios-subtext text-sm mt-1">
                        Estado financiero por vendedor · Vista consolidada (sin desglose de agencias)
                    </p>
                </div>
                {/* Selector de semana */}
                <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                    <span className="text-sm font-bold text-ios-subtext pl-3 hidden md:inline">Semana:</span>
                    <select
                        value={selectedPeriodId}
                        onChange={e => setSelectedPeriodId(e.target.value)}
                        className="px-4 py-2 bg-white dark:bg-black/50 border border-transparent rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ios-blue/50 appearance-none cursor-pointer"
                    >
                        {weeklyPeriods.map(p => (
                            <option key={p.id} value={p.id}>{p.label}{p.id === 'week-0' ? ' (Actual)' : ''}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tabla principal */}
            <div className="glass-panel p-6 rounded-3xl">
                {report.rows.length === 0 ? (
                    <div className="py-16 text-center text-ios-subtext">
                        <Receipt size={36} className="mx-auto mb-3 opacity-30" />
                        <p className="font-semibold">No hay ventas registradas en esta semana</p>
                        <p className="text-xs mt-1">Ve al módulo de Ventas para registrar movimientos.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {report.rows.map(row => {
                            const existingTicket = getExistingTicket(row.sellerId, row.currency);
                            const rowKey = row.sellerId + row.currency;
                            const isExpanded = expanded === rowKey;
                            const isGenerating = generatingFor === rowKey;

                            return (
                                <div key={rowKey} className="rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
                                    {/* Fila principal */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white/50 dark:bg-white/[0.03]">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-bold text-sm">{row.sellerName}</p>
                                                <span className="text-xs bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-lg font-mono">{row.currency}</span>
                                                {existingTicket && <StatusBadge status={existingTicket.status} />}
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-ios-subtext">
                                                <span>Venta: <strong className="text-ios-text">${fmt(row.totalSales)}</strong></span>
                                                <span>Banco: <strong className="text-ios-green">${fmt(row.totalBank)}</strong></span>
                                                <span>Pagado: <strong className="text-ios-blue">${fmt(row.totalPaid)}</strong></span>
                                                <span className={`font-bold ${row.balance > 0 ? 'text-red-500' : 'text-ios-green'}`}>
                                                    Balance: {row.balance > 0 ? `Debe $${fmt(row.balance)}` : `A favor $${fmt(Math.abs(row.balance))}`}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {/* Desglose por agencia (si hay) */}
                                            {row.agencyBreakdown.length > 0 && (
                                                <button
                                                    onClick={() => setExpanded(isExpanded ? null : rowKey)}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-ios-subtext bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black/10 transition-all"
                                                >
                                                    <Building2 size={13} />
                                                    {row.agencyBreakdown.length} Agencias
                                                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                </button>
                                            )}
                                            {/* Acción de generar/actualizar ticket */}
                                            <button
                                                onClick={() => handleGenerateTicket(row)}
                                                disabled={isGenerating}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${existingTicket ? 'bg-black/5 dark:bg-white/5 text-ios-subtext hover:bg-black/10' : 'bg-ios-blue text-white hover:bg-blue-600 shadow-sm'} disabled:opacity-50`}
                                            >
                                                {isGenerating ? (
                                                    <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                                ) : (
                                                    <CalendarCheck size={13} />
                                                )}
                                                {existingTicket ? 'Actualizar Ticket' : 'Generar Ticket'}
                                            </button>
                                            {/* Marcar como liquidada */}
                                            {existingTicket && existingTicket.status !== 'settled' && (
                                                <button
                                                    onClick={() => { updateWeeklyTicketStatus(existingTicket.id, 'settled'); refreshAll(); showToast('Semana marcada como liquidada'); }}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-ios-green/10 text-ios-green rounded-xl hover:bg-ios-green/20 transition-all"
                                                >
                                                    <CheckCircle2 size={13} /> Liquidar
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Desglose por agencia (expandible) */}
                                    {isExpanded && row.agencyBreakdown.length > 0 && (
                                        <div className="border-t border-black/5 dark:border-white/5 px-4 py-3 bg-black/[0.02] dark:bg-white/[0.02] animate-fade-in">
                                            <p className="text-xs font-bold text-ios-subtext uppercase tracking-wider mb-2">Desglose por Agencia</p>
                                            <div className="space-y-1.5">
                                                {row.agencyBreakdown.map(ag => (
                                                    <div key={ag.agencyName} className="flex items-center justify-between text-xs px-3 py-2 bg-white/60 dark:bg-white/5 rounded-xl">
                                                        <span className="flex items-center gap-1.5 font-semibold">
                                                            <Building2 size={11} className="text-ios-blue" /> {ag.agencyName}
                                                        </span>
                                                        <div className="flex gap-4 text-ios-subtext">
                                                            <span>Venta: <strong className="text-ios-text">${fmt(ag.amount)}</strong></span>
                                                            <span>Banco: <strong className="text-ios-green">${fmt(ag.totalBank)}</strong></span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Desglose completo de liquidación */}
                                    <div className="border-t border-black/5 dark:border-white/5 px-4 py-3 grid grid-cols-4 sm:grid-cols-7 gap-2 text-xs text-center">
                                        {[
                                            { label: 'Venta', value: row.totalSales, color: '' },
                                            { label: 'Premio', value: row.totalPrize, color: 'text-red-500' },
                                            { label: 'Comisión', value: row.totalCommission, color: 'text-red-500' },
                                            { label: 'Total Neto', value: row.totalNet, color: 'font-bold' },
                                            { label: 'Part.', value: row.totalParticipation, color: 'text-orange-500' },
                                            { label: 'Total Vendedor', value: row.totalVendor, color: 'text-ios-blue font-bold' },
                                            { label: 'Total Banca', value: row.totalBank, color: 'text-ios-green font-bold' },
                                        ].map(({ label, value, color }) => (
                                            <div key={label} className="flex flex-col gap-0.5">
                                                <span className="text-ios-subtext text-[10px] font-bold uppercase">{label}</span>
                                                <span className={`font-semibold ${color}`}>${fmt(value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Panel de Tickets Generados */}
            {tickets.filter(t => t.weekId === selectedPeriodId).length > 0 && (
                <div className="glass-panel p-6 rounded-3xl">
                    <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                        <Receipt size={18} className="text-ios-blue" /> Tickets Generados Esta Semana
                    </h2>
                    <div className="space-y-2">
                        {tickets.filter(t => t.weekId === selectedPeriodId).map(ticket => (
                            <div key={ticket.id} className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 text-sm">
                                <div>
                                    <span className="font-bold">{ticket.sellerName}</span>
                                    <span className="text-ios-subtext ml-2 text-xs">{ticket.currency}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold text-xs ${ticket.balance > 0 ? 'text-red-500' : 'text-ios-green'}`}>
                                        {ticket.balance > 0 ? `Debe $${fmt(ticket.balance)}` : `A favor $${fmt(Math.abs(ticket.balance))}`}
                                    </span>
                                    <StatusBadge status={ticket.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Nota informativa */}
            <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-ios-blue">
                <p className="text-sm font-bold">💡 Modo Consolidado Activo</p>
                <p className="text-xs text-ios-subtext mt-1">
                    Las ventas se registran a nivel vendedor (total de todas sus agencias). El desglose por agencia es opcional y solo aparece si la venta fue asociada a una agencia específica.
                </p>
            </div>
        </div>
    );
};
