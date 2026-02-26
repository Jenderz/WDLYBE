import { useState, useMemo, useEffect } from 'react';
import { Download, Plus, FileText, X, Calendar, CheckCircle2, XCircle, Clock, Image } from 'lucide-react';
import { TicketGenerator } from '../components/TicketGenerator';
import { getPayments, updatePaymentStatus, Payment } from '../services/localStore';

// Helper to generate last N Monday-to-Monday periods (same as Sales)
const generateWeeklyPeriods = (count = 5) => {
    const periods = [];
    const today = new Date();

    let currentMonday = new Date(today);
    const day = currentMonday.getDay();
    const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
    currentMonday.setDate(diff);
    currentMonday.setHours(0, 0, 0, 0);

    for (let i = 0; i < count; i++) {
        const startDate = new Date(currentMonday);
        startDate.setDate(startDate.getDate() - (i * 7));

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        endDate.setMilliseconds(endDate.getMilliseconds() - 1);

        const startStr = startDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        const endStr = new Date(endDate.getTime() + 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

        periods.push({
            id: `week-${i}`,
            label: `Lun ${startStr} - Lun ${endStr}`,
            startDate,
            endDate
        });
    }
    return periods;
};

export const Collections = () => {
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'list' | 'approvals'>('list');

    // Data states
    const [payments, setPayments] = useState<Payment[]>([]);

    // Weekly filter
    const weeklyPeriods = useMemo(() => generateWeeklyPeriods(), []);
    const [selectedPeriodId, setSelectedPeriodId] = useState(weeklyPeriods[0].id);

    // Refresh function
    const refreshData = () => setPayments(getPayments());

    useEffect(() => {
        refreshData();
    }, []);

    // Derived filtered data
    const filteredPayments = useMemo(() => {
        return payments.filter(p => p.weekId === selectedPeriodId);
    }, [payments, selectedPeriodId]);

    const pendingPayments = filteredPayments.filter(p => p.status === 'pending');

    // KPIs
    const totalCollected = filteredPayments
        .filter(p => p.status === 'approved' && p.currency === 'USD')
        .reduce((sum, p) => sum + p.amount, 0);

    const totalPending = pendingPayments
        .filter(p => p.currency === 'USD')
        .reduce((sum, p) => sum + p.amount, 0);

    const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleApprove = (id: string) => { updatePaymentStatus(id, 'approved'); refreshData(); };
    const handleReject = (id: string) => { updatePaymentStatus(id, 'rejected', rejectNote[id] || ''); refreshData(); };

    return (
        <div className="space-y-6 animate-fade-in pb-safe">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Recaudaciones</h1>
                    <p className="text-ios-subtext text-sm mt-1">Gestión de pagos recibidos de vendedores.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl text-sm font-semibold hover:shadow-sm transition-all">
                        <Download size={16} /> Exportar
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-ios-blue text-white rounded-xl text-sm font-semibold shadow-md hover:bg-blue-600 transition-all"
                    >
                        <Plus size={16} /> Nueva Recaudación
                    </button>
                </div>
            </div>

            {/* Modal de Registro (Popup) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-ios-bg dark:bg-black w-full max-w-4xl rounded-[2rem] p-6 relative shadow-2xl overflow-hidden glass-panel border border-white/20 max-h-[90vh] overflow-y-auto no-scrollbar">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 text-ios-subtext hover:text-ios-text z-10 bg-black/5 dark:bg-white/5 rounded-full">
                            <X size={20} />
                        </button>

                        <div className="bg-black dark:bg-white text-white dark:text-black text-center py-3 mb-6 rounded-xl shadow-sm">
                            <h2 className="text-xl font-bold tracking-wide">Registro de Recaudación de Pagos</h2>
                        </div>

                        <form className="space-y-5" onSubmit={e => e.preventDefault()}>
                            {/* Fila 1 */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 tracking-wider uppercase">Fecha de Registro</label>
                                    <div className="flex">
                                        <input type="date" className="w-full px-3 py-2 rounded-l-lg bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all font-mono text-ios-subtext" />
                                        <button type="button" className="px-3 bg-[#f0e68c] text-black rounded-r-lg border-l border-black/10 flex items-center justify-center hover:opacity-80 transition-opacity">
                                            <Calendar size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 tracking-wider uppercase">Semana de Corte</label>
                                    <select className="w-full px-3 py-2 rounded-lg bg-[#f0e68c] text-black font-bold border border-transparent outline-none text-sm transition-all appearance-none cursor-pointer text-center">
                                        {weeklyPeriods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Fila 2 */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 tracking-wider uppercase">Vendedor</label>
                                    <input type="text" className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 tracking-wider uppercase">Total_Banca</label>
                                    <input type="number" className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 tracking-wider uppercase">Moneda</label>
                                    <input type="text" className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all" />
                                </div>
                            </div>

                            {/* Fila 3 */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 tracking-wider uppercase">Monto Pendiente</label>
                                    <input type="number" disabled placeholder="0.00" className="w-full px-3 py-2 rounded-lg bg-cyan-100 dark:bg-cyan-900 border border-transparent text-black dark:text-white font-bold outline-none text-sm transition-all cursor-not-allowed" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 tracking-wider uppercase">Diferencia</label>
                                    <input type="number" disabled placeholder="0.00" className="w-full px-3 py-2 rounded-lg bg-cyan-100 dark:bg-cyan-900 border border-transparent text-black dark:text-white font-bold outline-none text-sm transition-all cursor-not-allowed" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 tracking-wider uppercase">Monto a Cancelar</label>
                                    <input type="number" placeholder="0.00" className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all" />
                                </div>
                            </div>

                            {/* Fila 4 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 tracking-wider uppercase">Banco</label>
                                    <select className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all appearance-none">
                                        <option>Seleccione Banco...</option>
                                        <option>Banesco</option>
                                        <option>Provincial</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 tracking-wider uppercase">Metodo</label>
                                    <select className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all appearance-none">
                                        <option>Seleccione Método...</option>
                                        <option>Transferencia</option>
                                        <option>Zelle</option>
                                        <option>Efectivo</option>
                                    </select>
                                </div>
                            </div>

                            {/* Botones Inferiores Mimetizados con tu Imagen */}
                            <div className="pt-4 flex flex-wrap gap-2 justify-center lg:justify-between border-t border-black/5 dark:border-white/5 mt-6">
                                <button type="button" className="flex-1 lg:flex-none min-w-[120px] py-3 rounded-lg bg-[#e2e2e2] dark:bg-gray-800 border border-[#b8b8b8] dark:border-gray-600 text-black dark:text-white font-bold text-xs transition-opacity hover:opacity-80">
                                    Buscar Recaudo
                                </button>
                                <button type="button" className="flex-1 lg:flex-none min-w-[100px] py-3 rounded-lg bg-[#ffccff] dark:bg-pink-900 border border-[#cc99cc] dark:border-pink-700 text-black dark:text-white font-bold text-xs transition-opacity hover:opacity-80">
                                    Limpiar
                                </button>
                                <button type="button" className="flex-1 lg:flex-none min-w-[100px] py-3 rounded-lg bg-[#ccffcc] dark:bg-green-900 border border-[#99cc99] dark:border-green-700 text-black dark:text-white font-bold text-xs transition-opacity hover:opacity-80">
                                    Modificar
                                </button>
                                <button type="button" className="flex-1 lg:flex-none min-w-[100px] py-3 rounded-lg bg-[#ffcccc] dark:bg-red-900 border border-[#cc9999] dark:border-red-700 text-black dark:text-white font-bold text-xs transition-opacity hover:opacity-80">
                                    Eliminar
                                </button>
                                <button type="submit" className="flex-1 lg:flex-none min-w-[120px] py-3 rounded-lg bg-[#000033] dark:bg-blue-900 text-white font-bold text-xs transition-opacity hover:opacity-80 shadow-md">
                                    Registrar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Tabs & Semanal Selector */}
            <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-white dark:bg-black/80 shadow-sm text-ios-text' : 'text-ios-subtext hover:text-ios-text'}`}
                    >
                        <FileText size={15} /> Lista de Cobros
                    </button>
                    <button
                        onClick={() => { setActiveTab('approvals'); }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'approvals' ? 'bg-white dark:bg-black/80 shadow-sm text-ios-text' : 'text-ios-subtext hover:text-ios-text'}`}
                    >
                        <Clock size={15} /> Comprobantes Pendientes
                        {pendingPayments.length > 0 && (
                            <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{pendingPayments.length}</span>
                        )}
                    </button>
                </div>

                {/* Filtro Semanal Principal para toda la pantalla */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <span className="text-xs font-bold text-ios-subtext uppercase tracking-wider">Semana:</span>
                    <select
                        value={selectedPeriodId}
                        onChange={(e) => setSelectedPeriodId(e.target.value)}
                        className="bg-black/5 dark:bg-white/5 border-none text-sm font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-ios-blue/50 cursor-pointer text-ios-text w-full sm:w-auto"
                    >
                        {weeklyPeriods.map(p => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* KPIs de Recaudación */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-ios-blue">
                    <p className="text-ios-subtext text-xs font-bold uppercase tracking-wider mb-2">Recaudado (Aprobado)</p>
                    <h3 className="text-2xl font-bold">${totalCollected.toFixed(2)}</h3>
                    <p className="text-xs text-ios-subtext mt-1">Líquido confirmado en USD</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-orange-500">
                    <p className="text-ios-subtext text-xs font-bold uppercase tracking-wider mb-2">Por Aprobar (Pendiente)</p>
                    <h3 className="text-2xl font-bold">${totalPending.toFixed(2)}</h3>
                    <p className="text-xs text-ios-subtext mt-1">Requiere validación manual</p>
                </div>
            </div>

            {/* Approvals Panel */}
            {activeTab === 'approvals' && (
                <div className="space-y-3 animate-fade-in">
                    {pendingPayments.length === 0 ? (
                        <div className="glass-panel p-10 rounded-2xl text-center text-ios-subtext">
                            <CheckCircle2 size={32} className="mx-auto mb-3 text-ios-green opacity-60" />
                            <p className="font-semibold">Sin comprobantes pendientes</p>
                            <p className="text-xs mt-1">Todos los pagos de esta semana están al día o no hay registros.</p>
                        </div>
                    ) : (
                        pendingPayments.map(p => (
                            <div key={p.id} className="glass-panel p-4 rounded-2xl space-y-3 border border-orange-500/20">
                                <div className="flex items-start gap-4">
                                    <div
                                        className="w-20 h-20 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 flex-shrink-0 flex items-center justify-center cursor-pointer border-2 border-ios-blue/20 hover:border-ios-blue/50 transition-colors"
                                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                                    >
                                        <div className="flex flex-col items-center justify-center w-full h-full text-ios-blue bg-blue-500/10">
                                            <FileText size={24} />
                                            <span className="text-[10px] mt-1 font-bold text-center leading-tight">Ver<br />Baucher</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-ios-blue">{p.vendorName}</p>
                                        <p className="text-xs text-ios-subtext">{p.date}</p>
                                        <p className="text-xl font-bold mt-1 text-green-500">{p.currency} {p.amount.toFixed(2)}</p>
                                        <p className="text-xs text-ios-subtext bg-black/5 dark:bg-white/5 p-2 rounded-lg mt-2 inline-block font-mono">{p.bank} — {p.method} | Ref: {p.reference}</p>
                                    </div>
                                </div>

                                {expandedId === p.id && (
                                    <div className="rounded-xl overflow-hidden animate-fade-in bg-black/5 dark:bg-white/5 p-4 text-center border border-black/10 dark:border-white/10">
                                        <p className="text-sm font-medium text-ios-subtext mb-2">Vista previa del comprobante no disponible en esta demo</p>
                                        <div className="w-full h-32 bg-black/10 dark:bg-white/10 rounded-lg flex items-center justify-center">
                                            <Image size={32} className="text-ios-subtext/50" />
                                        </div>
                                    </div>
                                )}

                                <input
                                    type="text"
                                    placeholder="Nota de rechazo (opcional)..."
                                    value={rejectNote[p.id] ?? ''}
                                    onChange={e => setRejectNote(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-transparent focus:border-red-500/50 outline-none text-sm transition-all"
                                />

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApprove(p.id)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 text-white shadow-md hover:bg-green-600 font-bold text-sm transition-all"
                                    >
                                        <CheckCircle2 size={16} /> Aprobar Ingreso
                                    </button>
                                    <button
                                        onClick={() => handleReject(p.id)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 font-bold text-sm transition-all"
                                    >
                                        <XCircle size={16} /> Rechazar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Tabla Principal */}
            {activeTab === 'list' && (
                <div className="glass-panel rounded-2xl overflow-hidden animate-fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-ios-subtext">ID RECIBO</th>
                                    <th className="px-6 py-4 font-semibold text-ios-subtext">VENDEDOR</th>
                                    <th className="px-6 py-4 font-semibold text-ios-subtext">MONTO USD</th>
                                    <th className="px-6 py-4 font-semibold text-ios-subtext font-bold text-center">ESTADO</th>
                                    <th className="px-6 py-4 font-semibold text-ios-subtext">FECHA</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                {filteredPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-ios-subtext italic">No hay pagos registrados en esta semana de corte.</td>
                                    </tr>
                                ) : (
                                    filteredPayments.map((row) => (
                                        <tr key={row.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group">
                                            <td className="px-6 py-4 font-medium font-mono text-xs">{row.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold">{row.vendorName}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-ios-green">
                                                {row.currency === 'USD' ? `+${row.amount.toFixed(2)}` : `${row.amount.toFixed(2)} ${row.currency}`}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${row.status === 'approved'
                                                    ? 'bg-ios-green/10 text-ios-green'
                                                    : row.status === 'rejected' ? 'bg-ios-red/10 text-ios-red' : 'bg-orange-500/10 text-orange-500'
                                                    }`}>
                                                    {row.status === 'approved' ? 'Aprobado' : row.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-ios-subtext">{row.date}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setSelectedTicket(row)}
                                                    className="text-ios-blue hover:text-blue-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Generar Ticket"
                                                >
                                                    <FileText size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Ticket Generator (No show Agency) */}
            {selectedTicket && (
                <TicketGenerator
                    id={selectedTicket.id}
                    type="Cobro"
                    amountUsd={selectedTicket.currency === 'USD' ? selectedTicket.amount : 0}
                    amountVes={selectedTicket.currency === 'VES' ? selectedTicket.amount : 0}
                    rateVes={48.25} // Dummy hardcode rate
                    clientName={selectedTicket.vendorName}
                    agencyName={''}
                    date={selectedTicket.date}
                    onClose={() => setSelectedTicket(null)}
                />
            )}

        </div>
    );
};
