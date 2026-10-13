import React, { useState } from 'react';
import {
    Package,
    Coins,
    Calendar,
    Users,
    UserCheck,
    Trash2,
    CheckCircle2,
    Loader2,
    UserMinus,
    PenLine,
    Link2,
    Layers,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { ImportSession } from './types';
import { Seller } from '../../services/apiService';
import { roundFinance } from '../../utils/finance';
import { normalizeCurrency, normalizeProductName, findProductDefaults } from '../../utils/importNormalize';

const DEFAULT_PRODUCTS = [
    'GATO NEGRO',
    'ANIMALITOS MAX PLAY',
    'PARLEY BETM3',
    'PARLEY INH',
    'LOTERIAS MAX PLAY',
    'TRIPLETA MAX PLAY',
    'AMERICANAS',
    'ANIMALITOS BETM3',
    'LOTERIA POSNET',
    'POSNET',
    'NACIONALES',
    'WORLDDEPORTES',
    'MAXPLAY',
    'GATO',
    'ANIMALITOS MAXPLAY',
    'PARLEY',
    'LOTERIAS',
    'GALILEO'
];

const CANONICAL_CURRENCY_OPTIONS = [
    { value: 'BOLIVARES VENEZOLANOS', label: 'BOLIVARES VENEZOLANOS (Bs)' },
    { value: 'DOLAR', label: 'DOLAR ($ / USD)' },
    { value: 'PESO COLOMBIANA', label: 'PESO COLOMBIANA (COP)' }
];

interface PreviewStepProps {
    session: ImportSession;
    setSession: React.Dispatch<React.SetStateAction<ImportSession | null>>;
    products: string[];
    currencies: string[];
    allSellers: Seller[];
    selectedRowIndices: number[];
    setSelectedRowIndices: React.Dispatch<React.SetStateAction<number[]>>;
    bulkTargetSeller: string;
    setBulkTargetSeller: (target: string) => void;
    bulkSaveAlias: boolean;
    setBulkSaveAlias: (save: boolean) => void;
    onApplyManualGroup: (targetSellerName: string, indicesToUpdate: number[], saveAlias: boolean) => void;
    onBulkMakeStandalone?: (indices: number[]) => void;
    onSeparateSource?: (rowIndex: number, sourceIndex: number) => void;
    onOpenGroupingModal: (vendorName?: string) => void;
    onDeleteRow: (index: number) => void;
    onCancel: () => void;
    onValidateAndImport: () => void;
    loading: boolean;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({
    session,
    setSession,
    products,
    currencies,
    allSellers,
    selectedRowIndices,
    setSelectedRowIndices,
    bulkTargetSeller,
    setBulkTargetSeller,
    bulkSaveAlias,
    setBulkSaveAlias,
    onApplyManualGroup,
    onBulkMakeStandalone,
    onSeparateSource,
    onOpenGroupingModal,
    onDeleteRow,
    onCancel,
    onValidateAndImport,
    loading
}) => {
    const [isCustomProduct, setIsCustomProduct] = useState(false);
    const [expandedRowIndices, setExpandedRowIndices] = useState<number[]>([]);

    const toggleRowExpand = (idx: number) => {
        setExpandedRowIndices(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    // Lista combinada y sin duplicados de productos sugeridos
    const availableProducts = Array.from(new Set([
        session.productName,
        ...DEFAULT_PRODUCTS,
        ...products
    ])).filter(Boolean);

    // Opciones de moneda combinadas
    const currencyOptions = React.useMemo(() => {
        const set = new Set(CANONICAL_CURRENCY_OPTIONS.map(c => c.value));
        const list = [...CANONICAL_CURRENCY_OPTIONS];
        for (const c of currencies || []) {
            const norm = normalizeCurrency(c);
            if (!set.has(norm)) {
                set.add(norm);
                list.push({ value: norm, label: norm });
            }
        }
        return list;
    }, [currencies]);

    // Cambiar producto y propagar a todas las filas en memoria
    const handleProductChange = (val: string) => {
        const norm = normalizeProductName(val);
        setSession(prev => {
            if (!prev) return null;
            return {
                ...prev,
                productName: norm,
                rows: prev.rows.map(r => ({
                    ...r,
                    productName: norm,
                    sourceRow: {
                        ...(r.sourceRow || {}),
                        _productName: norm
                    }
                }))
            };
        });
    };

    // Cambiar moneda y propagar a todas las filas en memoria
    const handleCurrencyChange = (val: string) => {
        const norm = normalizeCurrency(val);
        setSession(prev => {
            if (!prev) return null;
            return {
                ...prev,
                currency: norm,
                rows: prev.rows.map(r => ({
                    ...r,
                    sourceRow: {
                        ...(r.sourceRow || {}),
                        _currency: norm
                    }
                }))
            };
        });
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Cabecera de Configuración de Sesión */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-ios-subtext uppercase flex items-center gap-1.5">
                            <Package size={12} /> Producto
                        </label>
                        <button
                            type="button"
                            onClick={() => setIsCustomProduct(!isCustomProduct)}
                            className="text-[10px] font-semibold text-ios-blue hover:underline flex items-center gap-1"
                        >
                            <PenLine size={10} />
                            {isCustomProduct ? 'Elegir de lista' : 'Escribir otro'}
                        </button>
                    </div>

                    {isCustomProduct ? (
                        <input
                            type="text"
                            placeholder="Escribe el nombre del producto..."
                            value={session.productName}
                            onChange={(e) => handleProductChange(e.target.value)}
                            className="w-full bg-black/5 dark:bg-white/5 border border-ios-blue/40 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-ios-blue outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
                            autoFocus
                        />
                    ) : (
                        <select
                            value={session.productName}
                            onChange={(e) => {
                                if (e.target.value === '__custom__') {
                                    setIsCustomProduct(true);
                                } else {
                                    handleProductChange(e.target.value);
                                }
                            }}
                            className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-ios-blue outline-none cursor-pointer"
                        >
                            {!session.productName && (
                                <option value="" disabled className="text-ios-subtext">
                                    ⚠️ Selecciona el Producto...
                                </option>
                            )}
                            {availableProducts.map(p => (
                                <option key={p} value={p} className="bg-white dark:bg-[#1c1c1e] text-black dark:text-white">
                                    {p}
                                </option>
                            ))}
                            <option value="__custom__" className="bg-white dark:bg-[#1c1c1e] text-ios-blue font-bold">
                                + Escribir otro producto personalizado...
                            </option>
                        </select>
                    )}
                </div>

                <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                    <label className="text-[10px] font-bold text-ios-subtext uppercase flex items-center gap-1.5">
                        <Coins size={12} /> Moneda
                    </label>
                    <select
                        value={normalizeCurrency(session.currency)}
                        onChange={(e) => handleCurrencyChange(e.target.value)}
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-ios-blue outline-none cursor-pointer"
                    >
                        {currencyOptions.map(c => (
                            <option key={c.value} value={c.value} className="bg-white dark:bg-[#1c1c1e] text-black dark:text-white">
                                {c.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                    <label className="text-[10px] font-bold text-ios-subtext uppercase flex items-center gap-1.5">
                        <Calendar size={12} /> Fecha de Semana
                    </label>
                    <input
                        type="date"
                        value={session.date}
                        onChange={(e) => setSession({ ...session, date: e.target.value })}
                        className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-ios-blue outline-none"
                    />
                </div>
            </div>

            {/* Banner Informativo de Porcentajes del Producto Activo */}
            {session.productName ? (() => {
                const defs = findProductDefaults(session.productName);
                return (
                    <div className="glass-panel p-3.5 rounded-2xl border border-ios-blue/20 bg-ios-blue/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-ios-blue/10 text-ios-blue flex items-center justify-center font-black text-xs shrink-0">
                                %
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-black text-ios-blue uppercase tracking-wide">
                                        Producto Seleccionado: {session.productName}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ios-blue/10 text-ios-blue">
                                        Base Sugerida
                                    </span>
                                </div>
                                <p className="text-[11px] text-ios-subtext">
                                    Comisión de Venta: <strong className="text-ios-text font-black">{defs.commissionPct}%</strong> • Participación Banca/Vendedor: <strong className="text-ios-text font-black">{defs.partPct}%</strong>
                                </p>
                            </div>
                        </div>
                        <div className="text-[10px] text-ios-subtext bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5 text-right shrink-0">
                            Vendedores sin configurar en BD usarán esta base y podrás ajustarlos en el siguiente paso.
                        </div>
                    </div>
                );
            })() : (
                <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-3">
                    <span className="text-lg">⚠️</span>
                    <div className="text-xs">
                        <strong>Producto no seleccionado:</strong> Por favor elige el producto en el desplegable superior (ej. GATO, ANIMALITOS MAXPLAY, etc.) para aplicar sus porcentajes correctos.
                    </div>
                </div>
            )}

            {/* Resumen de Métricas */}
            {(() => {
                const totalTaquillas = session.rows.reduce((acc, r) => acc + (r.sources?.length || 1), 0);
                const uniqueVendorsCount = new Set(session.rows.map(r => r.vendorName)).size;
                const totalAliased = session.rows.reduce((acc, r) => acc + (r.sources ? r.sources.filter(s => s.isAliased).length : (r.isAliased ? 1 : 0)), 0);

                return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="glass-panel p-3.5 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                            <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Total Filas</p>
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                                <p className="text-xl font-black">{session.rows.length}</p>
                                {totalAliased > 0 && (
                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md" title={`${totalAliased} taquillas asignadas por alias`}>
                                        {totalAliased} con alias
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="glass-panel p-3.5 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                            <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Grupos Únicos</p>
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                                <p className="text-xl font-black text-ios-blue">
                                    {uniqueVendorsCount}
                                </p>
                                {totalTaquillas > session.rows.length && (
                                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-md" title={`${totalTaquillas} taquillas del archivo consolidadas en estos grupos`}>
                                        {totalTaquillas} taquillas
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="glass-panel p-3.5 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                            <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Ventas Totales</p>
                            <p className="text-xl font-black text-ios-green">
                                {roundFinance(session.rows.reduce((acc, r) => acc + r.sales, 0)).toLocaleString()}
                            </p>
                        </div>
                        <div className="glass-panel p-3.5 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                            <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Premios Totales</p>
                            <p className="text-xl font-black text-ios-red">
                                {roundFinance(session.rows.reduce((acc, r) => acc + r.prizes, 0)).toLocaleString()}
                            </p>
                        </div>
                        <div className="glass-panel p-3.5 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                            <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Importe Neto</p>
                            <p className="text-xl font-black">
                                {roundFinance(session.rows.reduce((acc, r) => acc + (r.sales - r.prizes), 0)).toLocaleString()}
                            </p>
                        </div>
                    </div>
                );
            })()}

            {/* Barra de Herramientas de Agrupación Manual cuando hay filas seleccionadas */}
            {selectedRowIndices.length > 0 && (
                <div className="glass-panel p-4 rounded-2xl border border-ios-blue/30 bg-ios-blue/5 flex flex-col md:flex-row items-center justify-between gap-3 animate-fade-in shadow-lg shadow-ios-blue/5">
                    <div className="flex items-center gap-2.5 text-ios-blue">
                        <div className="p-2 rounded-xl bg-ios-blue/10">
                            <Users size={18} />
                        </div>
                        <div>
                            <div className="text-xs font-bold leading-tight">
                                {selectedRowIndices.length} {selectedRowIndices.length === 1 ? 'fila seleccionada' : 'filas seleccionadas'}
                            </div>
                            <div className="text-[10px] text-ios-subtext">
                                Agrupar bajo un solo vendedor
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                        <div className="relative flex-1 md:w-56">
                            <input
                                list="grouping-sellers-list"
                                type="text"
                                placeholder="Vendedor destino..."
                                value={bulkTargetSeller}
                                onChange={e => setBulkTargetSeller(e.target.value.toUpperCase())}
                                className="w-full bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-ios-blue outline-none"
                            />
                            <datalist id="grouping-sellers-list">
                                {allSellers.map(s => <option key={String(s.id)} value={s.name} />)}
                            </datalist>
                        </div>

                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-ios-subtext cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={bulkSaveAlias}
                                onChange={e => setBulkSaveAlias(e.target.checked)}
                                className="rounded accent-ios-blue text-xs cursor-pointer"
                            />
                            Recordar alias
                        </label>

                        <button
                            type="button"
                            disabled={!bulkTargetSeller.trim()}
                            onClick={() => onApplyManualGroup(bulkTargetSeller, selectedRowIndices, bulkSaveAlias)}
                            className="px-4 py-1.5 bg-ios-blue text-white rounded-xl text-xs font-bold shadow-md shadow-ios-blue/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Agrupar Selección
                        </button>

                        {onBulkMakeStandalone && (
                            <button
                                type="button"
                                onClick={() => onBulkMakeStandalone(selectedRowIndices)}
                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                                title="Convertir las filas seleccionadas en vendedores independientes (sin grupo)"
                            >
                                <UserMinus size={13} />
                                Dejar Sin Grupo
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setSelectedRowIndices([])}
                            className="px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl text-xs font-semibold text-ios-subtext transition-colors"
                        >
                            Deseleccionar
                        </button>
                    </div>
                </div>
            )}

            {/* Cabecera de la tabla con acción de Agrupar */}
            <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-xs font-bold text-ios-subtext uppercase tracking-wider">
                    Detalle de Filas ({session.rows.length})
                </span>
                <button
                    type="button"
                    onClick={() => {
                        const firstVendor = session.rows[0]?.vendorName || '';
                        onOpenGroupingModal(firstVendor);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-ios-blue/10 hover:text-ios-blue text-ios-subtext text-xs font-bold flex items-center gap-1.5 transition-colors border border-black/5 dark:border-white/5"
                >
                    <Users size={13} />
                    Agrupar Vendedor...
                </button>
            </div>

            {/* Tabla de Filas */}
            <div className="glass-panel rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
                <div className="overflow-x-auto max-h-72 no-scrollbar">
                    <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-white dark:bg-[#1c1c1e] z-10 border-b border-black/5 dark:border-white/5">
                            <tr className="text-ios-subtext font-bold">
                                <th className="px-3 py-3 w-8 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedRowIndices.length === session.rows.length && session.rows.length > 0}
                                        onChange={e => {
                                            if (e.target.checked) {
                                                setSelectedRowIndices(session.rows.map((_, idx) => idx));
                                            } else {
                                                setSelectedRowIndices([]);
                                            }
                                        }}
                                        className="rounded accent-ios-blue cursor-pointer"
                                        title="Seleccionar todas"
                                    />
                                </th>
                                <th className="px-4 py-3">Vendedor / Grupo</th>
                                <th className="px-4 py-3">Producto</th>
                                {session.rows.some(r => r.agencyName) && (
                                    <th className="px-4 py-3">Agencia / Taquilla</th>
                                )}
                                <th className="px-4 py-3">Moneda</th>
                                <th className="px-4 py-3 text-right">Ventas</th>
                                <th className="px-4 py-3 text-right">Premios</th>
                                <th className="px-4 py-3 text-right">Importe Neto</th>
                                <th className="px-4 py-3 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {session.rows.map((row, i) => {
                                const normCurr = normalizeCurrency(row.sourceRow?._currency || session.currency);
                                const isBs = normCurr === 'BOLIVARES VENEZOLANOS';
                                const isCop = normCurr === 'PESO COLOMBIANA';
                                const rowProd = normalizeProductName(row.productName || session.productName);
                                const isSelected = selectedRowIndices.includes(i);
                                const isExpanded = expandedRowIndices.includes(i);

                                return (
                                    <React.Fragment key={i}>
                                        <tr className={`transition-colors ${isSelected ? 'bg-ios-blue/5' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                            <td className="px-3 py-2.5 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setSelectedRowIndices(prev => [...prev, i]);
                                                        } else {
                                                            setSelectedRowIndices(prev => prev.filter(idx => idx !== i));
                                                        }
                                                    }}
                                                    className="rounded accent-ios-blue cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="space-y-1">
                                                    <div className="flex items-center flex-wrap gap-1.5">
                                                        <span className="font-bold text-ios-blue">{row.vendorName}</span>

                                                        {/* Badge de Alias */}
                                                        {row.isAliased && (
                                                            <span
                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 cursor-help"
                                                                title={row.sources && row.sources.length > 1
                                                                    ? `Consolidado mediante alias de ${row.sources.length} orígenes`
                                                                    : `Alias asignado desde: ${row.originalName || 'archivo'}`}
                                                            >
                                                                <Link2 size={10} />
                                                                Alias
                                                            </span>
                                                        )}

                                                        {/* Chip de Agrupación Múltiple con botón acordeón */}
                                                        {row.sources && row.sources.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleRowExpand(i)}
                                                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md transition-all active:scale-95 ${
                                                                    isExpanded
                                                                        ? 'bg-purple-600 text-white shadow-xs'
                                                                        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/20'
                                                                }`}
                                                                title="Ver desglose de taquillas agrupadas en este vendedor"
                                                            >
                                                                <Layers size={11} />
                                                                <span>{row.sources.length} taquillas</span>
                                                                {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => onOpenGroupingModal(row.vendorName)}
                                                            className="p-1 rounded-lg text-ios-subtext/50 hover:text-ios-blue hover:bg-ios-blue/10 transition-colors"
                                                            title={`Reasignar o agrupar ${row.vendorName}`}
                                                        >
                                                            <UserCheck size={13} />
                                                        </button>
                                                    </div>

                                                    {/* Subtítulo si vino de un único alias pero con nombre original distinto */}
                                                    {row.isAliased && row.originalName && row.originalName.trim().toUpperCase() !== row.vendorName.trim().toUpperCase() && (!row.sources || row.sources.length <= 1) && (
                                                        <p className="text-[10px] text-ios-subtext leading-none flex items-center gap-1">
                                                            <span className="opacity-60">Origen:</span>
                                                            <span className="font-semibold text-ios-text">{row.originalName}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-ios-subtext">
                                                    {rowProd}
                                                </span>
                                            </td>
                                            {session.rows.some(r => r.agencyName) && (
                                                <td className="px-4 py-2.5 font-medium text-ios-text">
                                                    {row.agencyName || <span className="text-ios-subtext opacity-50">—</span>}
                                                </td>
                                            )}
                                            <td className="px-4 py-2.5">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    isBs
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                        : isCop
                                                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                            : 'bg-ios-blue/10 text-ios-blue'
                                                }`}>
                                                    {isBs ? 'Bs' : isCop ? 'COP' : 'USD'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right tabular-nums">{row.sales.toLocaleString()}</td>
                                            <td className="px-4 py-2.5 text-right tabular-nums text-ios-red">{row.prizes.toLocaleString()}</td>
                                            <td className="px-4 py-2.5 text-right tabular-nums font-black">{(row.sales - row.prizes).toLocaleString()}</td>
                                            <td className="px-4 py-2.5 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenGroupingModal(row.vendorName)}
                                                        className="p-1.5 text-ios-subtext hover:text-ios-blue hover:bg-ios-blue/10 rounded-xl transition-colors"
                                                        title="Agrupar a vendedor"
                                                    >
                                                        <Users size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => onDeleteRow(i)} 
                                                        className="p-1.5 text-ios-red/70 hover:text-ios-red hover:bg-ios-red/10 rounded-xl transition-colors"
                                                        title="Eliminar fila"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Subfila expandible con el desglose de taquillas */}
                                        {isExpanded && row.sources && row.sources.length > 1 && (
                                            <tr className="bg-purple-500/[0.03] dark:bg-purple-500/[0.05] border-t border-purple-500/10">
                                                <td colSpan={session.rows.some(r => r.agencyName) ? 9 : 8} className="p-3 pl-10 pr-6">
                                                    <div className="bg-white/90 dark:bg-[#202023]/90 backdrop-blur-md rounded-2xl p-3.5 border border-purple-500/20 shadow-sm space-y-2.5 animate-fade-in">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="p-1 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400">
                                                                    <Layers size={13} />
                                                                </div>
                                                                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                                                                    Desglose de Taquillas Agrupadas ({row.sources.length})
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-ios-subtext font-medium">
                                                                Suma consolidada en: <strong className="text-ios-blue font-bold">{row.vendorName}</strong>
                                                            </span>
                                                        </div>

                                                        <div className="divide-y divide-black/5 dark:divide-white/5 rounded-xl overflow-hidden bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                                                            {row.sources.map((src, sIdx) => {
                                                                const net = src.sales - src.prizes;
                                                                return (
                                                                    <div key={sIdx} className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                                                        <div className="flex items-center gap-2 min-w-[180px]">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                                            <span className="font-bold text-xs text-ios-text">{src.originalName}</span>
                                                                            {src.isAliased && (
                                                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
                                                                                    regla alias
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex items-center justify-between sm:justify-end gap-5 text-xs tabular-nums">
                                                                            <span className="text-[11px] text-ios-subtext">
                                                                                Venta: <strong className="text-ios-text font-bold">{src.sales.toLocaleString()}</strong>
                                                                            </span>
                                                                            <span className="text-[11px] text-ios-subtext">
                                                                                Premios: <strong className="text-ios-red font-bold">{src.prizes.toLocaleString()}</strong>
                                                                            </span>
                                                                            <span className="text-[11px] text-ios-subtext">
                                                                                Neto: <strong className={net >= 0 ? "text-ios-green font-black" : "text-ios-red font-black"}>{net.toLocaleString()}</strong>
                                                                            </span>

                                                                            {onSeparateSource && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => onSeparateSource(i, sIdx)}
                                                                                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all flex items-center gap-1 active:scale-95"
                                                                                    title={`Separar ${src.originalName} de este grupo y dejar como independiente`}
                                                                                >
                                                                                    <UserMinus size={11} />
                                                                                    Separar
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer con acciones */}
            <div className="flex justify-end gap-3 pt-4">
                <button onClick={onCancel} className="px-6 py-3 rounded-2xl text-sm font-bold text-ios-subtext hover:bg-black/5">
                    Cancelar
                </button>
                <button
                    onClick={onValidateAndImport}
                    disabled={loading}
                    className="px-8 py-3 bg-ios-blue text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-ios-blue/20 active:scale-95 transition-all text-sm disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={16} /> Validar e Importar</>}
                </button>
            </div>
        </div>
    );
};
