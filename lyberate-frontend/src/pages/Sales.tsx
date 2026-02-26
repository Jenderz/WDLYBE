import { useState, useMemo, useEffect } from 'react';
import { Download, Plus, X, Receipt } from 'lucide-react';
import { TicketGenerator } from '../components/TicketGenerator';
import { getSellers, Seller, getSales, addSale, Sale } from '../services/localStore';

// Helper to generate last N Monday-to-Sunday periods
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

        // Sunday = Monday + 6 days, at 23:59:59.999
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        const startStr = startDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        const endStr = endDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

        periods.push({
            id: `week-${i}`,
            label: `Lun ${startStr} — Dom ${endStr}`,
            startDate,
            endDate
        });
    }
    return periods;
};

// Hierarchy: Seller → Agency → Product → Payment Method (Currency)
// Now loaded from localStore in the component




export const Sales = () => {
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // View state
    const weeklyPeriods = useMemo(() => generateWeeklyPeriods(), []);
    const [selectedPeriodId, setSelectedPeriodId] = useState(weeklyPeriods[0].id);
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);

    useEffect(() => {
        setSellers(getSellers());
        setSales(getSales());
    }, []);


    // Form states — cascade: Seller → Product → Currency
    const [sellerId, setSellerId] = useState('');
    const [productId, setProductId] = useState('');
    const [currencyId, setCurrencyId] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [prize, setPrize] = useState<number | ''>('');
    const [date, setDate] = useState('');
    const [saleWeekId, setSaleWeekId] = useState(weeklyPeriods[0].id);

    // Derived selections
    const selectedSeller = sellers.find(s => s.id === sellerId);
    const selectedProduct = selectedSeller?.products.find(p => p.id === productId);
    const selectedCurrency = selectedProduct?.currencies.find(c => c.id === currencyId);


    // Reset downward when a parent changes
    const handleSellerChange = (id: string) => { setSellerId(id); setProductId(''); setCurrencyId(''); };

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

    const getSymbol = (currencyName: string = '') => {
        const lower = currencyName.toLowerCase();
        if (lower.includes('bolivar') || lower.includes('bs') || lower.includes('ves')) return 'Bs. ';
        if (lower.includes('peso') || lower.includes('cop')) return 'COP ';
        return '$';
    };
    const sym = selectedCurrency ? getSymbol(selectedCurrency.name) : '$';

    // Group sales for weekly report
    const weeklyReportData = useMemo(() => {
        const period = weeklyPeriods.find(p => p.id === selectedPeriodId);
        if (!period) return { rows: [], grandTotals: {} };

        // Filter sales by weekId strictly
        const filteredSales = sales.filter(s => s.weekId === period.id);

        // Group by Seller -> Product -> Currency
        type GroupedRow = {
            id: string,
            sellerName: string,
            productName: string,
            currencyName: string,
            amount: number,
            prize: number,
            commission: number,
            total: number,
            participation: number,
            totalVendor: number,
            totalBank: number
        };

        const groupedMap = new Map<string, GroupedRow>();

        filteredSales.forEach(s => {
            const key = `${s.sellerId}-${s.productId}-${s.currencyId}`;
            if (!groupedMap.has(key)) {
                groupedMap.set(key, { ...s, id: key });
            } else {
                const existing = groupedMap.get(key)!;
                existing.amount += s.amount;
                existing.prize += s.prize;
                existing.commission += s.commission;
                existing.total += s.total;
                existing.participation += s.participation;
                existing.totalVendor += s.totalVendor;
                existing.totalBank += s.totalBank;
            }
        });

        const rows = Array.from(groupedMap.values());
        rows.sort((a, b) => a.sellerName.localeCompare(b.sellerName) || a.productName.localeCompare(b.productName));

        // Calculate totals per currency
        const grandTotals: Record<string, Omit<GroupedRow, 'id' | 'sellerName' | 'productName' | 'currencyName'>> = {};
        rows.forEach(r => {
            if (!grandTotals[r.currencyName]) {
                grandTotals[r.currencyName] = { amount: 0, prize: 0, commission: 0, total: 0, participation: 0, totalVendor: 0, totalBank: 0 };
            }
            const t = grandTotals[r.currencyName];
            t.amount += r.amount;
            t.prize += r.prize;
            t.commission += r.commission;
            t.total += r.total;
            t.participation += r.participation;
            t.totalVendor += r.totalVendor;
            t.totalBank += r.totalBank;
        });

        return { rows, grandTotals };
    }, [sales, selectedPeriodId, weeklyPeriods]);

    const kpis = useMemo(() => {
        let salesUsd = 0;
        let salesBs = 0;
        let utilityUsd = 0;
        let utilityBs = 0;

        Object.entries(weeklyReportData.grandTotals).forEach(([currency, totals]) => {
            const isUsd = currency.toLowerCase().includes('usd') || currency.toLowerCase().includes('dolar');
            if (isUsd) {
                salesUsd += totals.amount;
                utilityUsd += totals.totalBank;
            } else {
                salesBs += totals.amount;
                utilityBs += totals.totalBank;
            }
        });

        return { salesUsd, salesBs, utilityUsd, utilityBs };
    }, [weeklyReportData]);

    return (
        <div className="space-y-6 animate-fade-in pb-safe">
            {/* Header con Buscador Semanal Centralizado */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Liquidación de Ventas</h1>
                    <p className="text-ios-subtext text-sm mt-1">Vista centralizada de movimientos y utilidades por semana.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 p-1 rounded-xl w-full sm:w-auto">
                        <span className="text-sm font-bold text-ios-subtext pl-3 hidden md:inline">Semana:</span>
                        <select
                            value={selectedPeriodId}
                            onChange={(e) => setSelectedPeriodId(e.target.value)}
                            className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-black/50 border border-transparent rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ios-blue/50 appearance-none cursor-pointer"
                        >
                            {weeklyPeriods.map(p => (
                                <option key={p.id} value={p.id}>{p.label}{p.id === 'week-0' ? ' (Actual)' : ''}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-black/5 dark:bg-white/5 text-ios-text rounded-xl font-bold hover:bg-black/10 transition-all text-sm">
                            <Download size={16} /> <span className="hidden sm:inline">Exportar</span>
                        </button>
                        <button onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-ios-blue text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-md text-sm">
                            <Plus size={16} /> Nueva Venta
                        </button>
                    </div>
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
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (!sellerId || !productId || !currencyId || amount === '') return;

                            addSale({
                                sellerId,
                                sellerName: selectedSeller?.name || '',
                                productId,
                                productName: selectedProduct?.name || '',
                                currencyId,
                                currencyName: selectedCurrency?.name || '',
                                amount: calcVenta,
                                prize: calcPremio,
                                commission: calcComision,
                                total: calcTotal,
                                participation: calcPart,
                                totalVendor: calcTotalVendedor,
                                totalBank: calcTotalBanca,
                                date: date || new Date().toISOString().split('T')[0],
                                weekId: saleWeekId,
                                registeredAt: new Date().toISOString()
                            });

                            setSales(getSales());
                            setAmount('');
                            setPrize('');
                            setDate('');
                            setCurrencyId('');
                            setProductId('');
                            setSellerId('');
                            setIsModalOpen(false);
                        }} className="space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar pr-1">
                            {/* Step 1: Vendedor */}
                            <div>
                                <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">1. Vendedor</label>
                                <select value={sellerId} onChange={e => handleSellerChange(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all appearance-none cursor-pointer">
                                    <option value="">Selecciona un vendedor...</option>
                                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            {/* Step 2: Producto y Moneda */}
                            <div>
                                <label className={`block text-xs font-semibold mb-1 uppercase tracking-wider ${sellerId ? 'text-ios-subtext' : 'text-ios-subtext/40'}`}>2. Producto y Método de Pago</label>
                                <select
                                    value={productId && currencyId ? `${productId}|${currencyId}` : ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (!val) {
                                            setProductId('');
                                            setCurrencyId('');
                                            return;
                                        }
                                        const [pid, cid] = val.split('|');
                                        setProductId(pid);
                                        setCurrencyId(cid);
                                    }}
                                    disabled={!sellerId}
                                    className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all appearance-none cursor-pointer disabled:opacity-40"
                                >
                                    <option value="">Selecciona producto y moneda...</option>
                                    {selectedSeller?.products.flatMap(p =>
                                        p.currencies.map(c => (
                                            <option key={`${p.id}|${c.id}`} value={`${p.id}|${c.id}`}>
                                                {p.name} — {c.name} (Comisión {c.commissionPct}% / Part {c.partPct}%)
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>

                            {/* Montos y Fecha */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-black/5 dark:border-white/5">
                                <div className="relative">
                                    <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Monto Venta</label>
                                    <div className="relative">
                                        {selectedCurrency && <span className="absolute left-4 top-3.5 text-ios-subtext font-bold text-sm pointer-events-none">{sym}</span>}
                                        <input type="number" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} disabled={!currencyId} className={`w-full ${selectedCurrency ? 'pl-10' : 'px-4'} pr-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all font-semibold disabled:opacity-40`} placeholder="0.00" />
                                    </div>
                                    {selectedCurrency && <p className="text-[10px] text-ios-subtext mt-1">{selectedCurrency.name}</p>}
                                </div>
                                <div className="relative">
                                    <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Premios Pagados</label>
                                    <div className="relative">
                                        {selectedCurrency && <span className="absolute left-4 top-3.5 text-ios-subtext font-bold text-sm pointer-events-none">{sym}</span>}
                                        <input type="number" step="0.01" value={prize} onChange={e => setPrize(Number(e.target.value))} disabled={!currencyId} className={`w-full ${selectedCurrency ? 'pl-10' : 'px-4'} pr-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-ios-blue outline-none transition-all font-semibold text-red-500 disabled:opacity-40`} placeholder="0.00" />
                                    </div>
                                    {selectedCurrency && <p className="text-[10px] text-ios-subtext mt-1">{selectedCurrency.name}</p>}
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Fecha</label>
                                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all" />
                                    </div>
                                    <div className="hidden">
                                        <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Semana</label>
                                        <select value={saleWeekId} onChange={e => setSaleWeekId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all appearance-none cursor-pointer">
                                            {weeklyPeriods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Semana de Corte</label>
                                <select value={saleWeekId} onChange={e => setSaleWeekId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all appearance-none cursor-pointer">
                                    {weeklyPeriods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                                </select>
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
                                        <div className="text-right font-bold text-ios-text">{sym}{calcVenta.toFixed(2)}</div>

                                        <div className="text-ios-subtext font-medium">Premio:</div>
                                        <div className="text-right font-bold text-red-500">-{sym}{Math.abs(calcPremio).toFixed(2)}</div>

                                        <div className="text-ios-subtext font-medium">Comisión ({comisionPct}%):</div>
                                        <div className="text-right font-bold text-red-500">-{sym}{Math.abs(calcComision).toFixed(2)}</div>

                                        <div className="col-span-2 border-t border-black/10 dark:border-white/10 my-2"></div>

                                        <div className="text-ios-subtext font-bold">Total Neto:</div>
                                        <div className="text-right font-bold text-ios-text">{sym}{calcTotal.toFixed(2)}</div>

                                        <div className="text-ios-subtext font-medium">Participación ({partPct}%):</div>
                                        <div className="text-right font-bold text-orange-500">{calcPart < 0 ? `-${sym}${Math.abs(calcPart).toFixed(2)}` : `${sym}${calcPart.toFixed(2)}`}</div>

                                        <div className="col-span-2 pt-2"></div>

                                        <div className="text-ios-subtext font-bold">Total Vendedor:</div>
                                        <div className="text-right font-bold text-ios-blue">{sym}{calcTotalVendedor.toFixed(2)}</div>

                                        <div className="text-ios-subtext font-bold">Total Banca:</div>
                                        <div className="text-right font-bold text-ios-green">{sym}{calcTotalBanca.toFixed(2)}</div>
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

            {/* KPIs Dinámicos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-ios-blue">
                    <p className="text-ios-subtext text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 md:mb-2">Ventas USD</p>
                    <h3 className="text-lg md:text-2xl font-bold text-ios-text">${kpis.salesUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-ios-green">
                    <p className="text-ios-subtext text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 md:mb-2">Utilidad Banca USD</p>
                    <h3 className="text-lg md:text-2xl font-bold text-ios-text">${kpis.utilityUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-orange-500">
                    <p className="text-ios-subtext text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 md:mb-2">Ventas Bs.</p>
                    <h3 className="text-lg md:text-2xl font-bold text-ios-text">Bs. {kpis.salesBs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-purple-500">
                    <p className="text-ios-subtext text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 md:mb-2">Utilidad Banca Bs.</p>
                    <h3 className="text-lg md:text-2xl font-bold text-ios-text">Bs. {kpis.utilityBs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                </div>
            </div>

            {/* Main Content Area: Liquidación Semanal */}
            <div className="glass-panel p-6 rounded-3xl animate-fade-in flex flex-col">
                <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-left text-ios-subtext">Vendedor</th>
                                <th className="px-4 py-3 font-semibold text-ios-subtext">Venta</th>
                                <th className="px-4 py-3 font-semibold text-ios-subtext">Premio</th>
                                <th className="px-4 py-3 font-semibold text-ios-subtext">Comision</th>
                                <th className="px-4 py-3 font-semibold text-ios-text">Total</th>
                                <th className="px-4 py-3 font-semibold text-ios-subtext">Part</th>
                                <th className="px-4 py-3 font-semibold text-ios-blue">Total Vendedor</th>
                                <th className="px-4 py-3 font-semibold text-ios-green">Total Banca</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {weeklyReportData.rows.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-ios-subtext">No hay ventas registradas en esta semana.</td>
                                </tr>
                            ) : (
                                weeklyReportData.rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3 text-left">
                                            <div className="font-bold text-ios-text">{row.sellerName}</div>
                                            <div className="text-xs text-ios-subtext font-medium mt-0.5">{row.productName} · <span className="font-bold opacity-80">{row.currencyName}</span></div>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-ios-subtext">${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 font-medium text-red-500">-${Math.abs(row.prize).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 font-medium text-red-500">-${Math.abs(row.commission).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 font-bold text-ios-text">{row.total < 0 ? `-$${Math.abs(row.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${row.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                        <td className="px-4 py-3 font-medium text-orange-500">{row.participation < 0 ? `-$${Math.abs(row.participation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${row.participation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                        <td className="px-4 py-3 font-bold text-ios-blue">${row.totalVendor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 font-bold text-ios-green">${row.totalBank.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                ))
                            )}

                            {/* Grand Totals loop */}
                            {Object.entries(weeklyReportData.grandTotals).map(([currency, totals]) => (
                                <tr key={currency} className="bg-black/5 dark:bg-white/5 font-bold text-sm border-t-2 border-black/10 dark:border-white/10">
                                    <td className="px-4 py-4 text-left text-ios-text">TOTALES {currency}</td>
                                    <td className="px-4 py-4 text-ios-subtext">${totals.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-4 text-red-500">-${Math.abs(totals.prize).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-4 text-red-500">-${Math.abs(totals.commission).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-4 text-ios-text">{totals.total < 0 ? `-$${Math.abs(totals.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                    <td className="px-4 py-4 text-orange-500">{totals.participation < 0 ? `-$${Math.abs(totals.participation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${totals.participation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                    <td className="px-4 py-4 text-ios-blue">${totals.totalVendor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-4 text-ios-green">${totals.totalBank.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
