import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
    FileUp,
    CheckCircle2,
    Loader2,
    UserPlus,
    Calendar,
    Coins,
    Package,
    X,
    Percent
} from 'lucide-react';
import {
    addSeller,
    getGlobalProducts,
    addGlobalProduct,
    getAvailableCurrencies,
    dateToWeekId,
    addSale,
    updateSeller,
    getSellers,
    getSales
} from '../services/apiService';
import { roundFinance } from '../utils/finance';

interface RawRow {
    vendorName: string;
    sales: number;
    prizes: number;
    sourceRow: any;
}

interface ImportSession {
    fileName: string;
    productName: string;
    currency: string;
    date: string; // YYYY-MM-DD
    rows: RawRow[];
    detectedType: 'betm3' | 'banklot' | 'maxplay' | 'unknown';
}

interface VendorConfig {
    name: string;
    commissionPct: number;
    partPct: number;
}

interface SalesImportModalProps {
    onClose: () => void;
    onImportSuccess: () => void;
}

export const SalesImportModal: React.FC<SalesImportModalProps> = ({ onClose, onImportSuccess }) => {
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<ImportSession | null>(null);
    const [products, setProducts] = useState<string[]>([]);
    const [currencies, setCurrencies] = useState<string[]>([]);

    // UI State
    const [step, setStep] = useState<'upload' | 'preview' | 'resolution' | 'success'>('upload');
    const [missingVendors, setMissingVendors] = useState<VendorConfig[]>([]);

    useEffect(() => {
        const load = async () => {
            const [prods, curs] = await Promise.all([getGlobalProducts(), getAvailableCurrencies()]);
            setProducts(prods);
            setCurrencies(curs);
        };
        load();
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = () => setDragging(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const parseAmount = (val: any): number => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return val;
        let s = String(val).replace(/\s/g, '');
        if (s.includes(',') && s.includes('.')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else if (s.includes(',')) {
            s = s.replace(',', '.');
        }
        const num = parseFloat(s);
        return isNaN(num) ? 0 : num;
    };

    const processFile = async (file: File) => {
        setLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                analyzeAndCreateSession(file.name, jsonData);
            };
            reader.readAsBinaryString(file);
        } catch (error) {
            console.error(error);
            alert("Error al leer el archivo");
        } finally {
            setLoading(false);
        }
    };

    const analyzeAndCreateSession = (fileName: string, data: any[][]) => {
        let detectedType: ImportSession['detectedType'] = 'unknown';
        let rows: RawRow[] = [];
        let productName = "";

        const contentStr = JSON.stringify(data.slice(0, 5));

        if (contentStr.includes("betm3.com") || contentStr.includes("Reporte General de Ventas")) {
            detectedType = 'betm3';
            productName = "PARLEY BETM3";
            const headerIndex = data.findIndex(r => r.includes("Nombre") && r.includes("Venta") && r.includes("Premio"));
            if (headerIndex !== -1) {
                data.slice(headerIndex + 1).forEach(row => {
                    const name = row[0];
                    if (name && name !== "Total" && name !== "Nombre") {
                        rows.push({
                            vendorName: String(name).trim().toUpperCase(),
                            sales: parseAmount(row[1]),
                            prizes: parseAmount(row[3]),
                            sourceRow: row
                        });
                    }
                });
            }
        }
        else if (contentStr.includes("CUADRE DE CAJA") || contentStr.includes("USUARIO") && contentStr.includes("VENTAS")) {
            detectedType = 'banklot';
            productName = "LOTERIAS";
            const headerIndex = data.findIndex(r => r.includes("USUARIO") && r.includes("VENTAS"));
            if (headerIndex !== -1) {
                data.slice(headerIndex + 1).forEach(row => {
                    const name = row[0];
                    if (name && !String(name).includes("TOTAL") && name !== "USUARIO") {
                        rows.push({
                            vendorName: String(name).trim(),
                            sales: parseAmount(row[1]),
                            prizes: parseAmount(row[2]),
                            sourceRow: row
                        });
                    }
                });
            }
        }
        else if (contentStr.includes("Maxplay") || (data[1] && data[1][0] === "Grupos" && data[1][1] === "Venta")) {
            detectedType = 'maxplay';
            productName = "MAXPLAY";
            const headerIndex = data.findIndex(r => r.includes("Grupos") && r.includes("Venta"));
            if (headerIndex !== -1) {
                data.slice(headerIndex + 1).forEach(row => {
                    const name = row[0];
                    if (name && name !== "TOTAL" && name !== "Grupos") {
                        rows.push({
                            vendorName: String(name).trim().toUpperCase(),
                            sales: parseAmount(row[1]),
                            prizes: 0,
                            sourceRow: row
                        });
                    }
                });
            }
        }

        if (rows.length === 0) {
            alert("No se pudo detectar un formato válido en este archivo.");
            return;
        }

        setSession({
            fileName,
            productName,
            currency: 'DOLAR',
            date: new Date().toISOString().split('T')[0],
            rows,
            detectedType
        });
        setStep('preview');
    };

    const validateVendors = async () => {
        if (!session) return;
        setLoading(true);

        try {
            const allSales = await getSales();
            
            // Check for duplicates
            const currentProductName = session.productName.toUpperCase();
            const currentCurrency = session.currency.toUpperCase();
            const currentDate = session.date;

            const nonDuplicateRows = session.rows.filter(row => {
                const vendorName = row.vendorName.toUpperCase();
                const isDuplicate = allSales.some(sale => 
                    sale.sellerName.trim().toUpperCase() === vendorName.trim().toUpperCase() &&
                    sale.productName.toUpperCase() === currentProductName &&
                    sale.currencyName.toUpperCase() === currentCurrency &&
                    sale.date === currentDate
                );
                return !isDuplicate;
            });

            const diff = session.rows.length - nonDuplicateRows.length;
            if (diff > 0) {
                if (nonDuplicateRows.length === 0) {
                    alert("No hay registros nuevos para importar. Todos los registros ya existen para esta fecha y producto.");
                    setLoading(false);
                    return;
                }
                const confirmImport = window.confirm(`Se encontraron ${diff} registros que ya existen. ¿Deseas importar solo los ${nonDuplicateRows.length} registros nuevos?`);
                if (!confirmImport) {
                    setLoading(false);
                    return;
                }
            }

            const newSession = { ...session, rows: nonDuplicateRows };
            setSession(newSession);

            const currentSellers = await getSellers();
            const missing = nonDuplicateRows
                .map(r => r.vendorName)
                .filter(name => {
                    const seller = currentSellers.find(s => s.name.trim().toUpperCase() === name.trim().toUpperCase());
                    if (!seller) return true;
                    
                    const productId = `p-${session.productName.toLowerCase().replace(/\s/g, '-')}`;
                    const product = seller.products.find(p => String(p.id) === String(productId) || p.name.toUpperCase() === session.productName.toUpperCase());
                    if (!product) return true;

                    const currencyConfig = product.currencies.find(c => String(c.id) === String(session.currency) || c.name.toUpperCase() === session.currency.toUpperCase());
                    if (!currencyConfig) return true;

                    return false;
                });

            const uniqueMissing = Array.from(new Set(missing));

            if (uniqueMissing.length > 0) {
                setMissingVendors(uniqueMissing.map(name => ({ name, commissionPct: 0, partPct: 0 })));
                setStep('resolution');
            } else {
                await executeImport(newSession);
            }
        } catch (error) {
            console.error(error);
            alert("Error al validar los registros de la importación.");
        } finally {
            setLoading(false);
        }
    };

    const createAndImportSellers = async () => {
        if (!session) return;

        const productId = `p-${session.productName.toLowerCase().replace(/\s/g, '-')}`;

        const currentSellers = await getSellers();

        for (const v of missingVendors) {
            const existingSeller = currentSellers.find(s => s.name.trim().toUpperCase() === v.name.trim().toUpperCase());
            
            if (existingSeller) {
                let product = existingSeller.products.find(p => String(p.id) === String(productId) || p.name.toUpperCase() === session.productName.toUpperCase());
                
                if (!product) {
                    product = {
                        id: productId,
                        name: session.productName,
                        currencies: []
                    };
                    existingSeller.products.push(product);
                }
                
                let currencyConfig = product.currencies.find(c => String(c.id) === String(session.currency) || c.name.toUpperCase() === session.currency.toUpperCase());
                
                if (!currencyConfig) {
                    currencyConfig = {
                        id: session.currency,
                        name: session.currency,
                        commissionPct: v.commissionPct,
                        partPct: v.partPct
                    };
                    product.currencies.push(currencyConfig);
                } else {
                    currencyConfig.commissionPct = v.commissionPct;
                    currencyConfig.partPct = v.partPct;
                }
                
                await updateSeller(existingSeller);
            } else {
                await addSeller({
                    name: v.name,
                    products: [
                        {
                            id: productId,
                            name: session.productName,
                            currencies: [
                                {
                                    id: session.currency,
                                    name: session.currency,
                                    commissionPct: v.commissionPct,
                                    partPct: v.partPct
                                }
                            ]
                        }
                    ]
                });
            }
        }

        setMissingVendors([]);
        await executeImport(session);
    };

    const executeImport = async (validSession?: ImportSession) => {
        const activeSession = validSession || session;
        if (!activeSession) return;
        setLoading(true);

        try {
            if (!(await getGlobalProducts()).includes(activeSession.productName.toUpperCase())) {
                await addGlobalProduct(activeSession.productName);
            }

            const allSellers = await getSellers();
            const weekId = dateToWeekId(activeSession.date);
            const productId = `p-${activeSession.productName.toLowerCase().replace(/\s/g, '-')}`;

            for (const row of activeSession.rows) {
                const seller = allSellers.find(s => s.name.trim().toUpperCase() === row.vendorName.trim().toUpperCase());
                if (!seller) continue;

                // Asegurar que el vendedor tenga el producto en su perfil
                let product = seller.products.find(p => 
                    String(p.id) === String(productId) || p.name.toUpperCase() === activeSession.productName.toUpperCase()
                );
                
                if (!product) {
                    product = {
                        id: productId,
                        name: activeSession.productName,
                        currencies: [{ id: activeSession.currency, name: activeSession.currency, commissionPct: 0, partPct: 0 }]
                    };
                    seller.products.push(product);
                }

                // Obtener moneda y sus porcentajes
                let currencyConfig = product.currencies.find(c => 
                    String(c.id) === String(activeSession.currency) || c.name.toUpperCase() === activeSession.currency.toUpperCase()
                );

                // Si la moneda no existe en el producto del vendedor, la agregamos con 0% por defecto
                if (!currencyConfig) {
                    currencyConfig = { id: activeSession.currency, name: activeSession.currency, commissionPct: 0, partPct: 0 };
                    product.currencies.push(currencyConfig);
                }

                // Actualizar vendedor en BD
                await updateSeller(seller);

                const comPct = currencyConfig.commissionPct;
                const partPct = currencyConfig.partPct;

                const comision = roundFinance(row.sales * (comPct / 100));
                const neto = roundFinance(row.sales - row.prizes - comision);
                const participacion = roundFinance(neto * (partPct / 100));

                await addSale({
                    sellerId: String(seller.id),
                    sellerName: seller.name,
                    productId: product.id,
                    productName: activeSession.productName,
                    currencyId: currencyConfig.id,
                    currencyName: activeSession.currency,
                    amount: row.sales,
                    prize: row.prizes,
                    commission: comision,
                    total: neto,
                    participation: participacion,
                    totalVendor: roundFinance(comision + participacion),
                    totalBank: roundFinance(neto - participacion),
                    date: activeSession.date,
                    weekId: weekId,
                    registeredAt: new Date().toISOString()
                });
            }

            setStep('success');
            onImportSuccess();
        } catch (error) {
            alert("Error durante la importación");
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setSession(null);
        setStep('upload');
        setMissingVendors([]);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden border border-black/5 dark:border-white/10 flex flex-col">
                {/* Modal Header */}
                <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-ios-blue/10 text-ios-blue flex items-center justify-center">
                            <FileUp size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Importación Centralizada</h2>
                            <p className="text-[10px] text-ios-subtext uppercase tracking-widest font-semibold">Tecnología WORLD DEPORTES</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                        <X size={20} className="text-ios-subtext" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                    {step === 'upload' && (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`
                                h-80 relative group overflow-hidden
                                border-2 border-dashed rounded-3xl p-12 transition-all duration-500
                                flex flex-col items-center justify-center gap-4 text-center
                                ${dragging
                                    ? 'border-ios-blue bg-ios-blue/5 scale-[1.01]'
                                    : 'border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5'
                                }
                            `}
                        >
                            <div className="w-16 h-16 rounded-2xl bg-ios-blue/10 flex items-center justify-center text-ios-blue animate-fade-in">
                                {loading ? <Loader2 className="animate-spin" size={32} /> : <FileUp size={32} />}
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold">Selecciona archivo de ventas</h3>
                                <p className="text-ios-subtext text-xs max-w-xs">Arrastra tu archivo Excel o CSV de Betm3, Banklot o Maxplay</p>
                            </div>
                            <label className="mt-4 px-6 py-2.5 bg-ios-blue text-white rounded-full font-bold cursor-pointer hover:brightness-110 active:scale-95 transition-all text-xs shadow-lg shadow-ios-blue/20">
                                Explorar Archivos
                                <input type="file" className="hidden" accept=".xlsx,.csv" onChange={handleFileChange} />
                            </label>
                        </div>
                    )}

                    {step === 'preview' && session && (
                        <div className="animate-fade-in space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                                    <label className="text-[10px] font-bold text-ios-subtext uppercase flex items-center gap-1.5"><Package size={12} /> Producto</label>
                                    <select
                                        value={session.productName}
                                        onChange={(e) => setSession({ ...session, productName: e.target.value })}
                                        className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-ios-blue outline-none"
                                    >
                                        {products.map(p => <option key={p} value={p}>{p}</option>)}
                                        {!products.includes(session.productName.toUpperCase()) && (
                                            <option value={session.productName}>{session.productName} (Nuevo)</option>
                                        )}
                                    </select>
                                </div>
                                <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                                    <label className="text-[10px] font-bold text-ios-subtext uppercase flex items-center gap-1.5"><Coins size={12} /> Moneda</label>
                                    <select
                                        value={session.currency}
                                        onChange={(e) => setSession({ ...session, currency: e.target.value })}
                                        className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-ios-blue outline-none"
                                    >
                                        {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                                    <label className="text-[10px] font-bold text-ios-subtext uppercase flex items-center gap-1.5"><Calendar size={12} /> Fecha de Semana</label>
                                    <input
                                        type="date"
                                        value={session.date}
                                        onChange={(e) => setSession({ ...session, date: e.target.value })}
                                        className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-ios-blue outline-none"
                                    />
                                </div>
                            </div>

                            <div className="glass-panel rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
                                <div className="overflow-x-auto max-h-60 no-scrollbar">
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 bg-white dark:bg-[#1c1c1e] z-10 border-b border-black/5 dark:border-white/5">
                                            <tr className="text-ios-subtext font-bold">
                                                <th className="px-5 py-3">Vendedor</th>
                                                <th className="px-5 py-3 text-right">Ventas</th>
                                                <th className="px-5 py-3 text-right">Premios</th>
                                                <th className="px-5 py-3 text-right">Importe Neto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {session.rows.map((row, i) => (
                                                <tr key={i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                    <td className="px-5 py-2.5 font-bold">{row.vendorName}</td>
                                                    <td className="px-5 py-2.5 text-right tabular-nums">{row.sales.toLocaleString()}</td>
                                                    <td className="px-5 py-2.5 text-right tabular-nums text-ios-red">{row.prizes.toLocaleString()}</td>
                                                    <td className="px-5 py-2.5 text-right tabular-nums font-black">{(row.sales - row.prizes).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={reset} className="px-6 py-3 rounded-2xl text-sm font-bold text-ios-subtext hover:bg-black/5">Cancelar</button>
                                <button
                                    onClick={validateVendors}
                                    disabled={loading}
                                    className="px-8 py-3 bg-ios-blue text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-ios-blue/20 active:scale-95 transition-all text-sm"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={16} /> Validar e Importar</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'resolution' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="text-center space-y-2 mb-6">
                                <div className="w-16 h-16 rounded-full bg-ios-blue/10 text-ios-blue flex items-center justify-center mx-auto">
                                    <UserPlus size={32} />
                                </div>
                                <h3 className="text-xl font-bold">Configuración de Porcentajes Faltantes</h3>
                                <p className="text-xs text-ios-subtext">Configura los porcentajes de experto para los {missingVendors.length} vendedores que no tienen este producto configurado.</p>
                            </div>

                            <div className="space-y-3 max-h-72 overflow-y-auto no-scrollbar pr-1">
                                {missingVendors.map((v, i) => (
                                    <div key={i} className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-ios-blue animate-pulse"></div>
                                            <span className="font-bold text-sm truncate">{v.name}</span>
                                        </div>
                                        <div className="flex items-center gap-4 col-span-2">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] font-bold text-ios-subtext uppercase">Venta (%)</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={v.commissionPct}
                                                        onChange={e => {
                                                            const copy = [...missingVendors];
                                                            copy[i].commissionPct = Number(e.target.value);
                                                            setMissingVendors(copy);
                                                        }}
                                                        className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-black focus:ring-1 focus:ring-ios-blue outline-none"
                                                    />
                                                    <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30" />
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] font-bold text-ios-subtext uppercase">Neto/Part (%)</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={v.partPct}
                                                        onChange={e => {
                                                            const copy = [...missingVendors];
                                                            copy[i].partPct = Number(e.target.value);
                                                            setMissingVendors(copy);
                                                        }}
                                                        className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-black focus:ring-1 focus:ring-ios-blue outline-none"
                                                    />
                                                    <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 pt-6">
                                <button onClick={reset} className="px-6 py-3 rounded-2xl text-sm font-bold text-ios-subtext hover:bg-black/5">Atrás</button>
                                <button
                                    onClick={createAndImportSellers}
                                    className="px-10 py-3 bg-ios-blue text-white rounded-2xl font-bold shadow-lg shadow-ios-blue/20 active:scale-95 transition-all text-sm"
                                >
                                    Crear y Finalizar Importación
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="animate-fade-in flex flex-col items-center justify-center gap-6 py-8 text-center">
                            <div className="w-20 h-20 rounded-full bg-ios-green/10 text-ios-green flex items-center justify-center animate-bounce-slow">
                                <CheckCircle2 size={48} />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold">¡Carga Completada!</h2>
                                <p className="text-ios-subtext text-sm">Los datos han sido liquidados e integrados correctamente.</p>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button onClick={onClose} className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold text-sm">Volver a Ventas</button>
                                <button onClick={reset} className="px-8 py-3 border border-black/10 dark:border-white/10 rounded-2xl font-bold text-sm">Nueva Carga</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
