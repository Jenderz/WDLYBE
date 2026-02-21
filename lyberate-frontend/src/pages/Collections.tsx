import { useState } from 'react';
import { Search, Download, Plus, Filter, MoreVertical, FileText, X, Calendar, CheckCircle2, XCircle, Clock, Image } from 'lucide-react';
import { TicketGenerator } from '../components/TicketGenerator';
import { getPayments, updatePaymentStatus, Payment } from '../services/localStore';

const DUMMY_COLLECTIONS = [
    { id: 'REC-001', vendor: 'Jhon Doe', agency: 'Agencia Centro', amountUsd: 450.00, amountVes: 21712.50, status: 'completed', date: '2026-02-20' },
    { id: 'REC-002', vendor: 'Maria Perez', agency: 'Agencia Este', amountUsd: 120.50, amountVes: 5814.12, status: 'pending', date: '2026-02-20' },
    { id: 'REC-003', vendor: 'Carlos Ruiz', agency: 'Agencia Norte', amountUsd: 850.00, amountVes: 41012.50, status: 'completed', date: '2026-02-19' },
    { id: 'REC-004', vendor: 'Ana Torres', agency: 'Agencia Sur', amountUsd: 320.00, amountVes: 15440.00, status: 'completed', date: '2026-02-18' },
];

export const Collections = () => {
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'list' | 'approvals'>('list');
    const [pendingPayments, setPendingPayments] = useState<Payment[]>(() =>
        getPayments().filter(p => p.status === 'pending')
    );
    const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const refreshPending = () => setPendingPayments(getPayments().filter(p => p.status === 'pending'));

    const handleApprove = (id: string) => { updatePaymentStatus(id, 'approved'); refreshPending(); };
    const handleReject = (id: string) => { updatePaymentStatus(id, 'rejected', rejectNote[id] || ''); refreshPending(); };

    return (
        <div className="space-y-6 animate-fade-in pb-safe">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Recaudaciones</h1>
                    <p className="text-ios-subtext text-sm mt-1">Gestión de pagos recibidos de vendedores y agencias.</p>
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

                        <form className="space-y-5">
                            {/* Fila 1 */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 tracking-wider uppercase">Fecha_1</label>
                                    <input type="date" className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all font-mono text-ios-subtext" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 tracking-wider uppercase">Fecha_2</label>
                                    <input type="date" className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all font-mono text-ios-subtext" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 tracking-wider uppercase">Fecha de Registro</label>
                                    <div className="flex">
                                        <input type="date" className="w-full px-3 py-2 rounded-l-lg bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all font-mono text-ios-subtext" />
                                        <button type="button" className="px-3 bg-[#f0e68c] text-black rounded-r-lg border-l border-black/10 flex items-center justify-center hover:opacity-80 transition-opacity">
                                            <Calendar size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <button type="button" className="w-full py-2.5 bg-[#f0e68c] hover:bg-[#e6db73] text-black font-bold rounded-lg text-sm transition-colors shadow-sm">
                                        Buscador Semanal
                                    </button>
                                </div>
                            </div>

                            {/* Fila 2 */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-ios-subtext mb-1 tracking-wider uppercase">Agencia</label>
                                    <input type="text" className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all" />
                                </div>
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
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                                {/* Opcional: Logo de Deportes (se omite para mantener el estilo limpio o se puede agregar imagen si es necesario) */}
                            </div>

                            {/* Fila 4 */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
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

            {/* KPIs de Recaudación (Billetera Dual - Lado Positivo) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-ios-blue">
                    <p className="text-ios-subtext text-xs font-bold uppercase tracking-wider mb-2">Total Recaudado (Semana)</p>
                    <h3 className="text-2xl font-bold">$12,450.00</h3>
                    <p className="text-xs text-ios-subtext mt-1">Líquido disponible en USD</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-orange-500">
                    <p className="text-ios-subtext text-xs font-bold uppercase tracking-wider mb-2">Por Aprobar (Pendiente)</p>
                    <h3 className="text-2xl font-bold">$1,240.50</h3>
                    <p className="text-xs text-ios-subtext mt-1">Requiere validación de soporte</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-ios-green">
                    <p className="text-ios-subtext text-xs font-bold uppercase tracking-wider mb-2">Tasa de Efectividad</p>
                    <h3 className="text-2xl font-bold">92%</h3>
                    <p className="text-xs text-ios-subtext mt-1">Deuda vs Pago esta semana</p>
                </div>
            </div>

            {/* View Tabs */}
            <div className="glass-panel p-2 rounded-2xl flex flex-col gap-3">
                <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar self-start">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-white dark:bg-black/80 shadow-sm text-ios-text' : 'text-ios-subtext hover:text-ios-text'}`}
                    >
                        <FileText size={15} /> Lista de Cobros
                    </button>
                    <button
                        onClick={() => { setActiveTab('approvals'); refreshPending(); }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'approvals' ? 'bg-white dark:bg-black/80 shadow-sm text-ios-text' : 'text-ios-subtext hover:text-ios-text'}`}
                    >
                        <Clock size={15} /> Comprobantes Pendientes
                        {pendingPayments.length > 0 && (
                            <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{pendingPayments.length}</span>
                        )}
                    </button>
                </div>

                {activeTab === 'list' && (
                    <div className="flex flex-col md:flex-row items-center gap-2 w-full">
                        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
                            {['all', 'completed', 'pending'].map((tab) => (
                                <button
                                    key={tab}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${tab === 'all' ? 'bg-white dark:bg-black/80 shadow-sm text-ios-text' : 'text-ios-subtext hover:text-ios-text'}`}
                                >
                                    {tab === 'all' ? 'Todas' : tab === 'completed' ? 'Aprobadas' : 'Pendientes'}
                                </button>
                            ))}
                        </div>
                        <div className="w-full md:flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={16} className="text-ios-subtext" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por recibo, vendedor o agencia..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-black/50 border border-black/5 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ios-blue/50"
                            />
                        </div>
                        <button className="p-2.5 bg-white dark:bg-black/50 border border-black/5 dark:border-white/5 rounded-xl text-ios-subtext hover:text-ios-text transition-all w-full md:w-auto flex justify-center items-center">
                            <Filter size={18} />
                        </button>
                    </div>
                )}
            </div>

            {/* Approvals Panel */}
            {activeTab === 'approvals' && (
                <div className="space-y-3 animate-fade-in">
                    {pendingPayments.length === 0 ? (
                        <div className="glass-panel p-10 rounded-2xl text-center text-ios-subtext">
                            <CheckCircle2 size={32} className="mx-auto mb-3 text-ios-green opacity-60" />
                            <p className="font-semibold">Sin comprobantes pendientes</p>
                            <p className="text-xs mt-1">Todos los pagos están al día.</p>
                        </div>
                    ) : (
                        pendingPayments.map(p => (
                            <div key={p.id} className="glass-panel p-4 rounded-2xl space-y-3">
                                <div className="flex items-start gap-4">
                                    {/* Proof image */}
                                    <div
                                        className="w-20 h-20 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 flex-shrink-0 flex items-center justify-center cursor-pointer border-2 border-ios-blue/20 hover:border-ios-blue/50 transition-colors"
                                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                                    >
                                        {p.proofImageBase64
                                            ? <img src={p.proofImageBase64} alt="Comprobante" className="w-full h-full object-cover" />
                                            : <Image size={24} className="text-ios-subtext opacity-40" />
                                        }
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold">{p.vendorName}</p>
                                        <p className="text-xs text-ios-subtext">{p.agencyName} · {p.date}</p>
                                        <p className="text-xl font-bold mt-1">{p.currency} {p.amount.toFixed(2)}</p>
                                        <p className="text-xs text-ios-subtext">{p.bank} — {p.method} | Ref: {p.reference}</p>
                                    </div>
                                </div>

                                {/* Expanded proof image */}
                                {expandedId === p.id && p.proofImageBase64 && (
                                    <div className="rounded-xl overflow-hidden">
                                        <img src={p.proofImageBase64} alt="Comprobante completo" className="w-full max-h-64 object-contain bg-black/10 dark:bg-white/5" />
                                    </div>
                                )}

                                {/* Reject note */}
                                <input
                                    type="text"
                                    placeholder="Nota de rechazo (opcional)..."
                                    value={rejectNote[p.id] ?? ''}
                                    onChange={e => setRejectNote(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm"
                                />

                                {/* Action buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApprove(p.id)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-ios-green/10 text-ios-green border border-ios-green/20 hover:bg-ios-green/20 font-bold text-sm transition-all"
                                    >
                                        <CheckCircle2 size={16} /> Aprobar
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
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-ios-subtext">ID RECIBO</th>
                                <th className="px-6 py-4 font-semibold text-ios-subtext">VENDEDOR / AGENCIA</th>
                                <th className="px-6 py-4 font-semibold text-ios-subtext">MONTO USD</th>
                                <th className="px-6 py-4 font-semibold text-ios-subtext">MONTO VES (Tasa Fija)</th>
                                <th className="px-6 py-4 font-semibold text-ios-subtext font-bold text-center">ESTADO</th>
                                <th className="px-6 py-4 font-semibold text-ios-subtext">FECHA</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {DUMMY_COLLECTIONS.map((row) => (
                                <tr key={row.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group">
                                    <td className="px-6 py-4 font-medium">{row.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold">{row.vendor}</div>
                                        <div className="text-xs text-ios-subtext">{row.agency}</div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-ios-green">
                                        +${row.amountUsd.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-ios-subtext">
                                        Bs. {row.amountVes.toLocaleString('es-VE')}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${row.status === 'completed'
                                            ? 'bg-ios-green/10 text-ios-green'
                                            : 'bg-orange-500/10 text-orange-500'
                                            }`}>
                                            {row.status === 'completed' ? 'Aprobado' : 'Pendiente'}
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
                                        <button className="text-ios-subtext hover:text-ios-text p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreVertical size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Ticket Generator */}
            {selectedTicket && (
                <TicketGenerator
                    id={selectedTicket.id}
                    type="Cobro"
                    amountUsd={selectedTicket.amountUsd}
                    amountVes={selectedTicket.amountVes}
                    rateVes={48.25} // Tasa dummy hardcodeada para preview
                    clientName={selectedTicket.vendor}
                    agencyName={selectedTicket.agency}
                    date={selectedTicket.date}
                    onClose={() => setSelectedTicket(null)}
                />
            )}

        </div>
    );
};
