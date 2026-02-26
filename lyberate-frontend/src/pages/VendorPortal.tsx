import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, CreditCard, LogOut, Plus, X, Upload,
    CheckCircle2, Clock, XCircle, TrendingUp, TrendingDown,
    Wallet, Landmark, ChevronDown, Image, Receipt, CalendarDays,
    ArrowUpCircle, ArrowDownCircle, BarChart2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
    getPaymentsByVendor, addPayment, getSales,
    getWeeklyTicketsBySeller,
    Payment, PaymentMethod, WeeklyTicket
} from '../services/localStore';

// ─── Mock vendor sales data (matches MOCK_SELLERS in Sales.tsx) ─────────────

// Generador de semanas (Lun → Dom)
const generateWeeklyPeriods = (count = 8) => {
    const periods = [];
    const today = new Date();
    let mon = new Date(today);
    const d = mon.getDay();
    mon.setDate(mon.getDate() - d + (d === 0 ? -6 : 1));
    mon.setHours(0, 0, 0, 0);
    for (let i = 0; i < count; i++) {
        const start = new Date(mon); start.setDate(start.getDate() - i * 7);
        // Domingo = lunes + 6 días
        const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
        const s = start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        const e = end.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        periods.push({ id: `week-${i}`, label: `Lun ${s} — Dom ${e}`, startDate: start, endDate: end });
    }
    return periods;
};

// Badge Estado de Ticket
const TicketStatusBadge = ({ status }: { status: WeeklyTicket['status'] }) => {
    const map = {
        open: { label: 'Abierta', cls: 'bg-orange-500/10 text-orange-500' },
        pending: { label: 'Pendiente', cls: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
        settled: { label: 'Liquidada', cls: 'bg-ios-green/10 text-ios-green' },
    };
    const { label, cls } = map[status];
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>{label}</span>;
};

const BANKS = ['Banesco', 'Provincial (BBVA)', 'Mercantil', 'BNC', 'Banplus', 'Bicentenario', 'Otro'];
const METHODS: PaymentMethod[] = ['Transferencia', 'Zelle', 'Pago Móvil', 'Efectivo', 'Otro'];

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: Payment['status'] }) => {
    const map = {
        pending: { label: 'Pendiente', icon: Clock, className: 'bg-orange-500/10 text-orange-500' },
        approved: { label: 'Aprobado', icon: CheckCircle2, className: 'bg-ios-green/10 text-ios-green' },
        rejected: { label: 'Rechazado', icon: XCircle, className: 'bg-red-500/10 text-red-500' },
    };
    const { label, icon: Icon, className } = map[status];
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${className}`}>
            <Icon size={11} /> {label}
        </span>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const VendorPortal = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const weeklyPeriods = useMemo(() => generateWeeklyPeriods(), []);

    const [tab, setTab] = useState<'dashboard' | 'payments' | 'weeks'>('dashboard');
    const [payments, setPayments] = useState<Payment[]>([]);
    const [weeklyTickets, setWeeklyTickets] = useState<WeeklyTicket[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Payment form state
    const [amount, setAmount] = useState<number | ''>('');
    const [currency, setCurrency] = useState('USD');
    const [bank, setBank] = useState('');
    const [method, setMethod] = useState<PaymentMethod>('Transferencia');
    const [reference, setReference] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [proofImage, setProofImage] = useState<string | null>(null);
    const [proofMimeType, setProofMimeType] = useState<string>('');
    const [proofName, setProofName] = useState('');
    const [formError, setFormError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sellerId = user?.sellerId ?? '';

    // ── Carga de datos ─────────────────────────────────────────────────────
    const refreshData = () => {
        if (user) {
            setPayments(getPaymentsByVendor(user.id));
            if (sellerId) setWeeklyTickets(getWeeklyTicketsBySeller(sellerId));
        }
    };
    useEffect(() => { refreshData(); }, [user]);

    // ── Ventas reales de la semana actual ──────────────────────────────────
    const weekSales = useMemo(() => {
        if (!sellerId) return { venta: 0, premio: 0, comision: 0, total: 0, part: 0, totalVendedor: 0, totalBanca: 0 };
        const sales = getSales().filter(s => s.sellerId === sellerId && s.weekId === 'week-0');
        return sales.reduce((acc, s) => ({
            venta: acc.venta + s.amount,
            premio: acc.premio + s.prize,
            comision: acc.comision + s.commission,
            total: acc.total + s.total,
            part: acc.part + s.participation,
            totalVendedor: acc.totalVendedor + s.totalVendor,
            totalBanca: acc.totalBanca + s.totalBank,
        }), { venta: 0, premio: 0, comision: 0, total: 0, part: 0, totalVendedor: 0, totalBanca: 0 });
    }, [sellerId]);

    // ── Ventas semana anterior (week-1) para estadísticas ──────────────────
    const prevWeekSales = useMemo(() => {
        if (!sellerId) return { venta: 0, totalBanca: 0, count: 0 };
        const sales = getSales().filter(s => s.sellerId === sellerId && s.weekId === 'week-1');
        return sales.reduce((acc, s) => ({ venta: acc.venta + s.amount, totalBanca: acc.totalBanca + s.totalBank, count: acc.count + 1 }), { venta: 0, totalBanca: 0, count: 0 });
    }, [sellerId]);

    const currWeekCount = useMemo(() => getSales().filter(s => s.sellerId === sellerId && s.weekId === 'week-0').length, [sellerId]);
    const growth = prevWeekSales.venta > 0 ? ((weekSales.venta - prevWeekSales.venta) / prevWeekSales.venta) * 100 : null;
    const avgTicket = currWeekCount > 0 ? weekSales.venta / currWeekCount : 0;
    const summary = weekSales;

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    // Image upload handler
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setFormError('La imagen no puede superar 5 MB.'); return; }
        setProofName(file.name);
        setProofMimeType(file.type);
        const reader = new FileReader();
        reader.onload = (ev) => setProofImage(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const resetForm = () => {
        setAmount(''); setCurrency('USD'); setBank(''); setMethod('Transferencia');
        setReference(''); setDate(new Date().toISOString().split('T')[0]);
        setProofImage(null); setProofName(''); setProofMimeType(''); setFormError('');
    };

    const handleSubmitPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !bank || !reference) { setFormError('Por favor completa todos los campos requeridos.'); return; }
        if (!user || !sellerId) return;
        const currentWeek = weeklyPeriods[0];
        addPayment({
            vendorId: user.id,
            vendorName: user.name,
            agencyName: user.agencyName ?? '',
            sellerId,
            week: currentWeek?.label || 'Semana actual',
            weekId: currentWeek?.id || 'week-0',
            amount: Number(amount),
            currency,
            bank,
            method,
            reference,
            date,
            status: 'pending',
            proofImageBase64: proofImage ?? undefined,
            proofMimeType: proofMimeType || undefined,
        });
        resetForm();
        setIsModalOpen(false);
        refreshPayments();
    };

    // KPI helpers
    const totalPaid = payments.filter(p => p.status === 'approved').reduce((s, p) => s + p.amount, 0);
    const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
    // Estado de cuenta: totalBanca de semanas abiertas - totalPaid aprobado
    const openTicketsBank = weeklyTickets.filter(t => t.status !== 'settled').reduce((s, t) => s + t.totalBank, 0);
    const accountBalance = openTicketsBank || summary.totalBanca; // fallback a semana actual
    const debt = Math.max(0, accountBalance - totalPaid);
    const pendingWeeks = weeklyTickets.filter(t => t.status !== 'settled');

    return (
        <div className="min-h-screen bg-ios-bg dark:bg-black">
            {/* Top Nav */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img src="https://orgemac.com/api/uploads/img_1767849584_a1254615.png" alt="Lyberate" className="w-8 h-8 object-contain" />
                    <div>
                        <p className="text-xs text-ios-subtext font-medium leading-none">Portal Vendedor</p>
                        <p className="text-sm font-bold leading-tight">{user?.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-ios-subtext bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg">{user?.agencyName}</span>
                    <button onClick={handleLogout} className="p-2 rounded-xl text-ios-subtext hover:text-red-500 hover:bg-red-500/10 transition-all">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <div className="max-w-2xl mx-auto p-4 space-y-5">
                {/* Tab Toggle */}
                <div className="flex bg-black/5 dark:bg-white/5 rounded-2xl p-1 gap-1">
                    <button onClick={() => setTab('dashboard')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab === 'dashboard' ? 'bg-white dark:bg-black shadow-sm text-ios-text' : 'text-ios-subtext'}`}>
                        <LayoutDashboard size={15} /> Mi Resumen
                    </button>
                    <button onClick={() => setTab('payments')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab === 'payments' ? 'bg-white dark:bg-black shadow-sm text-ios-text' : 'text-ios-subtext'}`}>
                        <CreditCard size={15} /> Mis Pagos
                        {payments.filter(p => p.status === 'pending').length > 0 && (
                            <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{payments.filter(p => p.status === 'pending').length}</span>
                        )}
                    </button>
                    <button onClick={() => setTab('weeks')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab === 'weeks' ? 'bg-white dark:bg-black shadow-sm text-ios-text' : 'text-ios-subtext'}`}>
                        <CalendarDays size={15} /> Semanas
                        {pendingWeeks.length > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{pendingWeeks.length}</span>
                        )}
                    </button>
                </div>

                {/* ── Dashboard Tab ─────────────────────────────────────────── */}
                {tab === 'dashboard' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Estado de Cuenta */}
                        <div className={`p-4 rounded-2xl flex items-center gap-4 ${debt > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-ios-green/10 border border-ios-green/20'}`}>
                            {debt > 0
                                ? <ArrowUpCircle size={28} className="text-red-500 shrink-0" />
                                : <ArrowDownCircle size={28} className="text-ios-green shrink-0" />}
                            <div className="flex-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-ios-subtext">Estado de Cuenta</p>
                                {debt > 0
                                    ? <p className="font-bold text-red-500 text-lg">Debes a la Banca: <span className="text-xl">${debt.toFixed(2)}</span></p>
                                    : <p className="font-bold text-ios-green text-lg">{accountBalance > 0 ? '✅ Al día' : 'Sin deuda pendiente'}</p>}
                            </div>
                        </div>

                        {/* Estadísticas rápidas */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="glass-panel p-3 rounded-2xl text-center">
                                <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Ventas Semana</p>
                                <p className="text-lg font-bold mt-1">${weekSales.venta.toFixed(0)}</p>
                                {growth !== null && (
                                    <p className={`text-[10px] font-bold mt-0.5 flex items-center justify-center gap-0.5 ${growth >= 0 ? 'text-ios-green' : 'text-red-500'}`}>
                                        {growth >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                        {Math.abs(growth).toFixed(1)}% vs sem. ant.
                                    </p>
                                )}
                            </div>
                            <div className="glass-panel p-3 rounded-2xl text-center">
                                <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Ticket Promedio</p>
                                <p className="text-lg font-bold mt-1">${avgTicket.toFixed(0)}</p>
                                <p className="text-[10px] text-ios-subtext mt-0.5">{currWeekCount} entradas</p>
                            </div>
                            <div className="glass-panel p-3 rounded-2xl text-center">
                                <BarChart2 size={16} className="text-ios-blue mx-auto mb-1" />
                                <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Semanas Pend.</p>
                                <p className="text-lg font-bold mt-1">{pendingWeeks.length}</p>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-base font-bold">Corte Semanal Actual</h2>
                            <p className="text-xs text-ios-subtext">{weeklyPeriods[0]?.label}</p>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-ios-blue">
                                <div className="flex items-center gap-1.5 text-ios-subtext text-xs font-bold uppercase tracking-wider mb-2">
                                    <TrendingUp size={12} /> Mis Ganancias
                                </div>
                                <p className="text-2xl font-bold text-ios-blue">${summary?.totalVendedor.toFixed(2) ?? '—'}</p>
                                <p className="text-[10px] text-ios-subtext mt-1">Comisión + Participación</p>
                            </div>
                            <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-red-500">
                                <div className="flex items-center gap-1.5 text-ios-subtext text-xs font-bold uppercase tracking-wider mb-2">
                                    <TrendingDown size={12} /> Premios Pagados
                                </div>
                                <p className="text-2xl font-bold text-red-500">${summary?.premio.toFixed(2) ?? '—'}</p>
                                <p className="text-[10px] text-ios-subtext mt-1">Salidas operativas</p>
                            </div>
                            <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-orange-500">
                                <div className="flex items-center gap-1.5 text-ios-subtext text-xs font-bold uppercase tracking-wider mb-2">
                                    <Landmark size={12} /> Deuda con Banca
                                </div>
                                <p className="text-2xl font-bold text-orange-500">${debt.toFixed(2)}</p>
                                <p className="text-[10px] text-ios-subtext mt-1">Total Banca — Pagado</p>
                            </div>
                            <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-ios-green">
                                <div className="flex items-center gap-1.5 text-ios-subtext text-xs font-bold uppercase tracking-wider mb-2">
                                    <Wallet size={12} /> Pagos Aprobados
                                </div>
                                <p className="text-2xl font-bold text-ios-green">${totalPaid.toFixed(2)}</p>
                                <p className="text-[10px] text-ios-subtext mt-1">Abonos confirmados</p>
                            </div>
                        </div>

                        {/* Liquidation Detail */}
                        {summary && (
                            <div className="glass-panel p-4 rounded-2xl">
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                    <Receipt size={15} className="text-ios-blue" /> Desglose de Liquidación
                                </h3>
                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                    {[
                                        { label: 'Venta Total', value: summary.venta, color: '' },
                                        { label: 'Premios Pagados', value: -summary.premio, color: 'text-red-500' },
                                        { label: `Comisión`, value: -summary.comision, color: 'text-red-500' },
                                        { label: 'Total Neto', value: summary.total, color: 'font-bold' },
                                        { label: 'Participación', value: -summary.part, color: 'text-orange-500' },
                                    ].map(({ label, value, color }) => (
                                        <>
                                            <div key={label + 'l'} className="text-ios-subtext">{label}</div>
                                            <div key={label + 'v'} className={`text-right font-semibold ${color}`}>
                                                {value < 0 ? `-$${Math.abs(value).toFixed(2)}` : `$${value.toFixed(2)}`}
                                            </div>
                                        </>
                                    ))}
                                    <div className="col-span-2 border-t border-black/10 dark:border-white/10 my-1" />
                                    <div className="text-ios-blue font-bold">Total Vendedor</div>
                                    <div className="text-right font-bold text-ios-blue">${summary.totalVendedor.toFixed(2)}</div>
                                    <div className="text-ios-green font-bold">Total Banca</div>
                                    <div className="text-right font-bold text-ios-green">${summary.totalBanca.toFixed(2)}</div>
                                </div>
                            </div>
                        )}

                        {/* Pending alert */}
                        {totalPending > 0 && (
                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                                <Clock size={16} className="text-orange-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400">Pagos en revisión</p>
                                    <p className="text-xs text-ios-subtext">Tienes ${totalPending.toFixed(2)} en pagos esperando aprobación del admin.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Semanas Tab ────────────────────────────────────────────── */}
                {tab === 'weeks' && (
                    <div className="space-y-4 animate-fade-in">
                        <h2 className="text-lg font-bold">Historial de Semanas</h2>
                        {weeklyTickets.length === 0 ? (
                            <div className="glass-panel p-10 rounded-2xl text-center text-ios-subtext">
                                <CalendarDays size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="font-semibold">No hay tickets semanales aún</p>
                                <p className="text-xs mt-1">El administrador los generará al cerrar cada semana.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {weeklyTickets.sort((a, b) => a.weekId.localeCompare(b.weekId)).map(ticket => (
                                    <div key={ticket.id} className="glass-panel p-4 rounded-2xl">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-bold text-sm">{ticket.weekLabel}</p>
                                                <p className="text-xs text-ios-subtext mt-0.5">{ticket.currency}</p>
                                            </div>
                                            <TicketStatusBadge status={ticket.status} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 mt-3">
                                            <div className="text-center">
                                                <p className="text-[10px] text-ios-subtext font-bold uppercase">Venta</p>
                                                <p className="font-bold text-sm mt-0.5">${ticket.totalSales.toFixed(2)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] text-ios-subtext font-bold uppercase">Total Banca</p>
                                                <p className="font-bold text-sm mt-0.5 text-ios-green">${ticket.totalBank.toFixed(2)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] text-ios-subtext font-bold uppercase">Balance</p>
                                                <p className={`font-bold text-sm mt-0.5 ${ticket.balance > 0 ? 'text-red-500' : 'text-ios-green'}`}>
                                                    {ticket.balance > 0 ? `-$${ticket.balance.toFixed(2)}` : `+$${Math.abs(ticket.balance).toFixed(2)}`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Payments Tab ──────────────────────────────────────────── */}
                {tab === 'payments' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold">Mis Recaudaciones</h2>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-ios-blue text-white rounded-xl text-sm font-semibold shadow-md hover:bg-blue-600 transition-all"
                            >
                                <Plus size={16} /> Registrar Pago
                            </button>
                        </div>

                        {payments.length === 0 ? (
                            <div className="glass-panel p-10 rounded-2xl text-center text-ios-subtext">
                                <CreditCard size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="font-semibold">No has registrado pagos aún</p>
                                <p className="text-xs mt-1">Presiona "Registrar Pago" para enviar un comprobante.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {payments.map(p => (
                                    <div key={p.id} className="glass-panel p-4 rounded-2xl flex gap-4 items-start">
                                        {/* Comprobante thumbnail */}
                                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 flex-shrink-0 flex items-center justify-center">
                                            {p.proofImageBase64
                                                ? <img src={p.proofImageBase64} alt="Comprobante" className="w-full h-full object-cover" />
                                                : <Image size={20} className="text-ios-subtext opacity-40" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-bold text-sm">{p.bank} — {p.method}</p>
                                                    <p className="text-xs text-ios-subtext">Ref: {p.reference} · {p.date}</p>
                                                </div>
                                                <StatusBadge status={p.status} />
                                            </div>
                                            <p className="text-xl font-bold mt-1">{p.currency} {p.amount.toFixed(2)}</p>
                                            {p.status === 'rejected' && p.adminNote && (
                                                <p className="text-xs text-red-500 mt-1 font-medium">Motivo: {p.adminNote}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Payment Modal ─────────────────────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-ios-bg dark:bg-[#111] w-full max-w-lg rounded-[2rem] p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
                        <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="absolute top-4 right-4 p-2 rounded-full bg-black/5 dark:bg-white/5 text-ios-subtext hover:text-ios-text">
                            <X size={20} />
                        </button>
                        <h2 className="text-lg font-bold mb-5">Registrar Recaudación</h2>

                        <form onSubmit={handleSubmitPayment} className="space-y-4">
                            {/* Amount + Currency */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 uppercase tracking-wider">Monto *</label>
                                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} required className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none font-semibold text-lg" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 uppercase tracking-wider">Moneda</label>
                                    <div className="relative">
                                        <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-3 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none appearance-none pr-7 font-semibold cursor-pointer">
                                            {['USD', 'Bolívares', 'Peso COP'].map(c => <option key={c}>{c}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-ios-subtext pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Bank + Method */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 uppercase tracking-wider">Banco *</label>
                                    <div className="relative">
                                        <select value={bank} onChange={e => setBank(e.target.value)} required className="w-full px-3 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none appearance-none pr-7 cursor-pointer">
                                            <option value="">Selecciona...</option>
                                            {BANKS.map(b => <option key={b}>{b}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-ios-subtext pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 uppercase tracking-wider">Método</label>
                                    <div className="relative">
                                        <select value={method} onChange={e => setMethod(e.target.value as PaymentMethod)} className="w-full px-3 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none appearance-none pr-7 cursor-pointer">
                                            {METHODS.map(m => <option key={m}>{m}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-ios-subtext pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Reference + Date */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 uppercase tracking-wider">N° Referencia *</label>
                                    <input type="text" value={reference} onChange={e => setReference(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none font-mono" placeholder="REF-XXXXXX" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 uppercase tracking-wider">Fecha</label>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none" />
                                </div>
                            </div>

                            {/* Comprobante Upload */}
                            <div>
                                <label className="block text-xs font-bold text-ios-subtext mb-1 uppercase tracking-wider">Comprobante (opcional)</label>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                {proofImage ? (
                                    <div className="relative rounded-xl overflow-hidden border border-ios-blue/30">
                                        <img src={proofImage} alt="Comprobante" className="w-full max-h-48 object-contain bg-black/5 dark:bg-white/5" />
                                        <button type="button" onClick={() => { setProofImage(null); setProofName(''); }} className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-500/80 transition-colors">
                                            <X size={14} />
                                        </button>
                                        <div className="px-3 py-2 bg-black/5 dark:bg-white/5 text-xs text-ios-subtext truncate">{proofName}</div>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-ios-blue/30 hover:border-ios-blue/60 rounded-xl p-6 flex flex-col items-center gap-2 text-ios-subtext hover:text-ios-blue transition-all">
                                        <Upload size={24} />
                                        <span className="text-sm font-medium">Toca para subir imagen</span>
                                        <span className="text-xs">JPG, PNG, WEBP hasta 5 MB</span>
                                    </button>
                                )}
                            </div>

                            {/* Error */}
                            {formError && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">{formError}</div>
                            )}

                            {/* Submit */}
                            <button type="submit" className="w-full py-3.5 bg-ios-blue text-white font-bold rounded-xl shadow-md hover:bg-blue-600 transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2">
                                <CheckCircle2 size={18} /> Enviar Recaudación
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
