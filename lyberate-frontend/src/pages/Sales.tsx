import { useState, useMemo, useEffect } from 'react';
import { Search, Download, Plus, AlertTriangle, MoreHorizontal, FileText, X, Receipt, CalendarRange } from 'lucide-react';
import { TicketGenerator } from '../components/TicketGenerator';
import { getSellers, Seller } from '../services/localStore';

// Helper to generate last N Monday-to-Monday periods
const generateWeeklyPeriods = (count = 5) => {
    const periods = [];
    const today = new Date();

    // Find most recent Monday
    let currentMonday = new Date(today);
    const day = currentMonday.getDay(); // 0 is Sunday, 1 is Monday
    const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
    currentMonday.setDate(diff);
    currentMonday.setHours(0, 0, 0, 0);

    for (let i = 0; i < count; i++) {
        const startDate = new Date(currentMonday);
        startDate.setDate(startDate.getDate() - (i * 7));

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        endDate.setMilliseconds(endDate.getMilliseconds() - 1); // 23:59:59.999 of Sunday

        const startStr = startDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        const endStr = new Date(endDate.getTime() + 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }); // Monday

        periods.push({
            id: `week-${i}`,
            label: `Lun ${startStr} - Lun ${endStr}`,
            startDate,
            endDate
        });
    }
    return periods;
};

// Hierarchy: Seller → Agency → Product → Payment Method (Currency)
// Now loaded from localStore in the component


const DUMMY_SALES = [
    { id: 'FAC-1020', vendor: 'Jhon Doe', agency: 'Agencia Centro', amountUsd: 1200.00, debtUsd: 450.00, status: 'partial', date: '2026-02-15' },
    { id: 'FAC-1021', vendor: 'Maria Perez', agency: 'Agencia Este', amountUsd: 850.50, debtUsd: 0.00, status: 'paid', date: '2026-02-16' },
    { id: 'FAC-1022', vendor: 'Carlos Ruiz', agency: 'Agencia Norte', amountUsd: 3400.00, debtUsd: 3400.00, status: 'unpaid', date: '2026-02-19' },
    { id: 'FAC-1023', vendor: 'Ana Torres', agency: 'Agencia Sur', amountUsd: 520.00, debtUsd: 20.00, status: 'partial', date: '2026-02-20' },
];

export const Sales = () => {
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // View state
    const [activeView, setActiveView] = useState<'invoices' | 'weekly_report'>('invoices');
    const weeklyPeriods = useMemo(() => generateWeeklyPeriods(), []);
    const [selectedPeriodId, setSelectedPeriodId] = useState(weeklyPeriods[0].id);
    const [sellers, setSellers] = useState<Seller[]>([]);

    useEffect(() => {
        setSellers(getSellers());
    }, []);


    // Form states — cascade: Seller → Agency → Product → Currency
    const [sellerId, setSellerId] = useState('');
    const [agencyId, setAgencyId] = useState('');
    const [productId, setProductId] = useState('');
    const [currencyId, setCurrencyId] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [prize, setPrize] = useState<number | ''>('');
    const [date, setDate] = useState('');

    // Derived selections
    const selectedSeller = sellers.find(s => s.id === sellerId);
    const selectedAgency = selectedSeller?.agencies.find(a => a.id === agencyId);
    const selectedProduct = selectedAgency?.products.find(p => p.id === productId);
    const selectedCurrency = selectedProduct?.currencies.find(c => c.id === currencyId);


    // Reset downward when a parent changes
    const handleSellerChange = (id: string) => { setSellerId(id); setAgencyId(''); setProductId(''); setCurrencyId(''); };
    const handleAgencyChange = (id: string) => { setAgencyId(id); setProductId(''); setCurrencyId(''); };
    const handleProductChange = (id: string) => { setProductId(id); setCurrencyId(''); };

    // Liquidation calculations
    const calcVenta = Number(amount) || 0;
    const calcPremio = Number(prize) || 0;
    const comisionPct = selectedCurrency?.commissionPct || 0;
    const partPct = selectedCurrency?.partPct || 0;

    const calcComision = calcVenta * (comisionPct / 100);
    const calcTotal = calcVenta - calcPremio - calcComision;
    const calcPart = calcTotal * (partPct / 100);
    const calcTotalVendedor = calcComision + calcPart;
    const calcTotalBanca = calcTotal - calcPart;

    return (
        <div className="space-y-6 animate-fade-in pb-safe">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
                    <p className="text-ios-subtext text-sm mt-1">Gestión del crédito otorgado y panorama de deuda de la red.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl text-sm font-semibold hover:shadow-sm transition-all">
                        <Download size={16} /> Exportar
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-ios-blue text-white rounded-xl text-sm font-semibold shadow-md hover:bg-blue-600 transition-all"
                    >
                        <Plus size={16} /> Nueva Venta
                    </button>
                </div>
            </div>

            {/* Modal de Registro de Venta */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-ios-bg dark:bg-black w-full max-w-2xl rounded-[2rem] p-6 relative shadow-2xl overflow-hidden glass-panel border border-white/20">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 text-ios-subtext hover:text-ios-text z-10 bg-black/5 dark:bg-white/5 rounded-full">
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold mb-4">Registro de Ventas (Facturación)</h2>
                        <form className="space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar pr-1">
                            {/* Step 1: Vendedor */}
                            <div>
                                <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">1. Vendedor</label>
                                <select value={sellerId} onChange={e => handleSellerChange(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all appearance-none cursor-pointer">
                                    <option value="">Selecciona un vendedor...</option>
                                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            {/* Step 2: Agencia */}
                            <div>
                                <label className={`block text-xs font-semibold mb-1 uppercase tracking-wider ${sellerId ? 'text-ios-subtext' : 'text-ios-subtext/40'}`}>2. Agencia</label>
                                <select value={agencyId} onChange={e => handleAgencyChange(e.target.value)} disabled={!sellerId} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all appearance-none cursor-pointer disabled:opacity-40">
                                    <option value="">Selecciona una agencia...</option>
                                    {selectedSeller?.agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>

                            {/* Step 3: Producto */}
                            <div>
                                <label className={`block text-xs font-semibold mb-1 uppercase tracking-wider ${agencyId ? 'text-ios-subtext' : 'text-ios-subtext/40'}`}>3. Producto</label>
                                <select value={productId} onChange={e => handleProductChange(e.target.value)} disabled={!agencyId} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all appearance-none cursor-pointer disabled:opacity-40">
                                    <option value="">Selecciona un producto...</option>
                                    {selectedAgency?.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            {/* Step 4: Moneda / Método de Pago */}
                            <div>
                                <label className={`block text-xs font-semibold mb-1 uppercase tracking-wider ${productId ? 'text-ios-subtext' : 'text-ios-subtext/40'}`}>4. Método de Pago</label>
                                <select value={currencyId} onChange={e => setCurrencyId(e.target.value)} disabled={!productId} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all appearance-none cursor-pointer disabled:opacity-40">
                                    <option value="">Selecciona la moneda...</option>
                                    {selectedProduct?.currencies.map(c => <option key={c.id} value={c.id}>{c.name} — Comisión {c.commissionPct}% / Part {c.partPct}%</option>)}
                                </select>
                            </div>

                            {/* Montos y Fecha */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-black/5 dark:border-white/5">
                                <div>
                                    <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Monto Venta</label>
                                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} disabled={!currencyId} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all font-semibold disabled:opacity-40" placeholder="0.00" />
                                    {selectedCurrency && <p className="text-[10px] text-ios-subtext mt-1">{selectedCurrency.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Premios Pagados</label>
                                    <input type="number" step="0.01" value={prize} onChange={e => setPrize(Number(e.target.value))} disabled={!currencyId} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all font-semibold text-red-500 disabled:opacity-40" placeholder="0.00" />
                                    {selectedCurrency && <p className="text-[10px] text-ios-subtext mt-1">{selectedCurrency.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Fecha</label>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all" />
                                </div>
                            </div>

                            {/* Panel de Liquidación */}
                            {selectedCurrency && (
                                <div className="mt-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 animate-fade-in">
                                    <h3 className="text-sm font-bold text-ios-text mb-3 flex items-center gap-2">
                                        <Receipt size={16} className="text-ios-blue" />
                                        Resumen de Liquidación
                                    </h3>
                                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                                        <div className="text-ios-subtext font-medium">Venta:</div>
                                        <div className="text-right font-semibold">${calcVenta.toFixed(2)}</div>

                                        <div className="text-ios-subtext font-medium">Premio:</div>
                                        <div className="text-right font-semibold text-red-500">-${calcPremio.toFixed(2)}</div>

                                        <div className="text-ios-subtext font-medium">Comisión ({comisionPct}%):</div>
                                        <div className="text-right font-semibold text-red-500">-${calcComision.toFixed(2)}</div>

                                        <div className="col-span-2 border-t border-black/10 dark:border-white/10 my-1"></div>

                                        <div className="text-ios-subtext font-bold">Total Neto:</div>
                                        <div className="text-right font-bold text-ios-text">${calcTotal.toFixed(2)}</div>

                                        <div className="text-ios-subtext font-medium">Participación ({partPct}%):</div>
                                        <div className="text-right font-semibold text-orange-500">-${calcPart.toFixed(2)}</div>

                                        <div className="col-span-2 border-t border-black/10 dark:border-white/10 my-1"></div>

                                        <div className="text-ios-subtext font-bold text-ios-blue">Total Vendedor:</div>
                                        <div className="text-right font-bold text-ios-blue">${calcTotalVendedor.toFixed(2)}</div>

                                        <div className="text-ios-subtext font-bold text-ios-green">Total Banca:</div>
                                        <div className="text-right font-bold text-ios-green">${calcTotalBanca.toFixed(2)}</div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex flex-wrap gap-2 justify-end border-t border-black/5 dark:border-white/5 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl bg-black/5 dark:bg-white/5 text-ios-text font-bold hover:bg-black/10 transition-all text-sm">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-6 py-3 rounded-xl bg-ios-blue text-white font-bold hover:bg-blue-600 transition-all shadow-md text-sm">
                                    Procesar Venta
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* KPIs de Cuentas por Cobrar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-orange-500">
                    <p className="text-ios-subtext text-xs font-bold uppercase tracking-wider mb-2">Deuda Total Activa</p>
                    <h3 className="text-2xl font-bold">$3,870.00</h3>
                    <p className="text-xs text-ios-subtext mt-1 flex items-center gap-1 text-orange-500 font-medium">
                        <AlertTriangle size={12} /> Requiere gestión de cobro
                    </p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-ios-blue">
                    <p className="text-ios-subtext text-xs font-bold uppercase tracking-wider mb-2">Ventas del Mes</p>
                    <h3 className="text-2xl font-bold">$18,450.50</h3>
                    <p className="text-xs text-ios-subtext mt-1">Base histórica en USD</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-ios-green">
                    <p className="text-ios-subtext text-xs font-bold uppercase tracking-wider mb-2">Cartera Sana</p>
                    <h3 className="text-2xl font-bold">78%</h3>
                    <p className="text-xs text-ios-subtext mt-1">Pagado vs Facturado</p>
                </div>
            </div>

            {/* Filters and Search / Report Select */}
            <div className="glass-panel p-2 rounded-2xl flex flex-col items-start gap-4">
                {/* View Toggles */}
                <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar self-start">
                    <button
                        onClick={() => setActiveView('invoices')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeView === 'invoices'
                            ? 'bg-white dark:bg-black/80 shadow-sm text-ios-text'
                            : 'text-ios-subtext hover:text-ios-text'
                            }`}
                    >
                        <Receipt size={16} /> Registro de Facturas
                    </button>
                    <button
                        onClick={() => setActiveView('weekly_report')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeView === 'weekly_report'
                            ? 'bg-white dark:bg-black/80 shadow-sm text-ios-text'
                            : 'text-ios-subtext hover:text-ios-text'
                            }`}
                    >
                        <CalendarRange size={16} /> Liquidación Semanal
                    </button>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-2 w-full">
                    {activeView === 'invoices' ? (
                        <>
                            <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
                                {['all', 'unpaid', 'partial', 'paid'].map((tab) => (
                                    <button
                                        key={tab}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${tab === 'all'
                                            ? 'bg-white dark:bg-black/80 shadow-sm text-ios-text'
                                            : 'text-ios-subtext hover:text-ios-text'
                                            }`}
                                    >
                                        {tab === 'all' ? 'Todas' : tab === 'unpaid' ? 'Por Cobrar' : tab === 'partial' ? 'Abonadas' : 'Cobradas'}
                                    </button>
                                ))}
                            </div>
                            <div className="w-full md:flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search size={16} className="text-ios-subtext" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Buscar por factura, vendedor o agencia..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-black/50 border border-black/5 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ios-blue/50"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="w-full flex items-center gap-3">
                            <span className="text-sm font-bold text-ios-subtext whitespace-nowrap">Semana de Corte:</span>
                            <select
                                value={selectedPeriodId}
                                onChange={(e) => setSelectedPeriodId(e.target.value)}
                                className="w-full md:w-[300px] px-4 py-2.5 bg-white dark:bg-black/50 border border-black/5 dark:border-white/5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ios-blue/50 appearance-none cursor-pointer"
                            >
                                {weeklyPeriods.map(p => (
                                    <option key={p.id} value={p.id}>{p.label}{p.id === 'week-0' ? ' (Actual)' : ''}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            {activeView === 'invoices' ? (
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-ios-subtext">FACTURA</th>
                                    <th className="px-6 py-4 font-semibold text-ios-subtext">VENDEDOR / AGENCIA</th>
                                    <th className="px-6 py-4 font-semibold text-ios-subtext">TOTAL VENTA (USD)</th>
                                    <th className="px-6 py-4 font-semibold text-ios-text font-bold">DEUDA ACTUAL</th>
                                    <th className="px-6 py-4 font-semibold text-ios-subtext font-bold text-center">ESTADO</th>
                                    <th className="px-6 py-4 font-semibold text-ios-subtext">FECHA</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                {DUMMY_SALES.map((row) => (
                                    <tr key={row.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group">
                                        <td className="px-6 py-4 font-medium">{row.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold">{row.vendor}</div>
                                            <div className="text-xs text-ios-subtext">{row.agency}</div>
                                        </td>
                                        <td className="px-6 py-4 text-ios-subtext">
                                            ${row.amountUsd.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-bold text-base ${row.debtUsd > 0 ? 'text-orange-500' : 'text-ios-green'}`}>
                                                ${row.debtUsd.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {row.status === 'paid' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-ios-green/10 text-ios-green">Cobrada</span>}
                                            {row.status === 'partial' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-ios-blue/10 text-ios-blue">Con Abonos</span>}
                                            {row.status === 'unpaid' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-ios-red/10 text-ios-red">Deuda Viva</span>}
                                        </td>
                                        <td className="px-6 py-4 text-ios-subtext">{row.date}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedTicket(row)}
                                                className="text-ios-blue hover:text-blue-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Generar Factura"
                                            >
                                                <FileText size={18} />
                                            </button>
                                            <button className="text-ios-subtext hover:text-ios-text p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="glass-panel p-6 rounded-3xl animate-fade-in flex flex-col">
                    <div className="mb-4">
                        <h2 className="text-lg font-bold">Reporte de Registros de Ventas Semanal</h2>
                        <p className="text-sm text-ios-subtext">Corte: {weeklyPeriods.find(p => p.id === selectedPeriodId)?.label}</p>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50 min-h-[300px]">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-[#1b2f56] text-white">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-left">Agencia / Vendedor</th>
                                    <th className="px-4 py-3 font-semibold">Venta</th>
                                    <th className="px-4 py-3 font-semibold">Premio</th>
                                    <th className="px-4 py-3 font-semibold">Comision</th>
                                    <th className="px-4 py-3 font-semibold">Total</th>
                                    <th className="px-4 py-3 font-semibold">Part</th>
                                    <th className="px-4 py-3 font-semibold">Total Vendedor</th>
                                    <th className="px-4 py-3 font-semibold">Total Banca</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#c3d3ea] bg-[#e0eaf5] text-black">
                                <tr className="hover:bg-[#d4e1f0]">
                                    <td className="px-4 py-2 font-bold text-left">{'Centro / Jhon Doe'}</td>
                                    <td className="px-4 py-2 relative text-blue-900 border-l border-white/40">13,289.00</td>
                                    <td className="px-4 py-2 text-blue-900 border-l border-white/40">34,589.00</td>
                                    <td className="px-4 py-2 text-blue-900 border-l border-white/40">1,328.90</td>
                                    <td className="px-4 py-2 text-blue-900 border-l border-white/40">-22,628.90</td>
                                    <td className="px-4 py-2 text-blue-900 border-l border-white/40">-4,525.78</td>
                                    <td className="px-4 py-2 text-blue-900 border-l border-white/40">-3,196.88</td>
                                    <td className="px-4 py-2 text-blue-900 border-l border-white/40">-18,103.12</td>
                                </tr>
                                <tr className="hover:bg-[#d4e1f0] bg-[#cedced]">
                                    <td className="px-4 py-2 font-bold text-left">{'Norte / Carlos Ruiz'}</td>
                                    <td className="px-4 py-2 text-blue-900 border-l border-white/40">1,420.00</td>
                                    <td className="px-4 py-2 text-blue-900 border-l border-white/40">782.00</td>
                                    <td className="px-4 py-2 text-blue-900 border-l border-white/40">71.00</td>
                                    <td className="px-4 py-2 text-blue-900 border-l border-white/40">567.00</td>
                                    <td className="px-4 py-2 text-blue-900 border-l border-white/40">56.70</td>
                                    <td className="px-4 py-2 text-blue-900 border-l border-white/40">127.70</td>
                                    <td className="px-4 py-2 text-blue-900 border-l border-white/40">510.30</td>
                                </tr>
                                <tr className="bg-[#1b2f56] text-white font-bold">
                                    <td className="px-4 py-3 text-left">TOTALES USD</td>
                                    <td className="px-4 py-3 border-l border-white/20">14,809.00</td>
                                    <td className="px-4 py-3 border-l border-white/20">35,384.00</td>
                                    <td className="px-4 py-3 border-l border-white/20">1,409.90</td>
                                    <td className="px-4 py-3 border-l border-white/20">-21,984.90</td>
                                    <td className="px-4 py-3 border-l border-white/20">-4,453.68</td>
                                    <td className="px-4 py-3 border-l border-white/20">-3,043.78</td>
                                    <td className="px-4 py-3 border-l border-white/20">-17,531.22</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Ticket Generator */}
            {selectedTicket && (
                <TicketGenerator
                    id={selectedTicket.id}
                    type="Venta"
                    amountUsd={selectedTicket.amountUsd}
                    amountVes={selectedTicket.amountUsd * 48.25} // Calculado para preview
                    rateVes={48.25}
                    clientName={selectedTicket.vendor}
                    agencyName={selectedTicket.agency}
                    date={selectedTicket.date}
                    onClose={() => setSelectedTicket(null)}
                />
            )}

        </div>
    );
};
