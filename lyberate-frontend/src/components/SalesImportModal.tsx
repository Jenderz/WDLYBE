import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { FileUp, X } from 'lucide-react';
import {
    getGlobalProducts,
    addGlobalProduct,
    getAvailableCurrencies,
    dateToWeekId,
    getSellerAliases,
    addSellerAlias,
    deleteSellerAlias,
    Seller,
    getAgencies,
    addAgency,
    Agency
} from '../services/apiService';
import { useApiScope } from '../hooks/useApiScope';
import { roundFinance } from '../utils/finance';

import {
    RawRow,
    ConsolidatedSource,
    ImportSession,
    VendorConfig,
    ManualRawData,
    ImportStep,
    SalesImportModalProps
} from './SalesImport/types';
import {
    parseAmount,
    analyzeImportData
} from './SalesImport/parsers';
import {
    normalizeCurrency,
    normalizeProductName,
    normalizeSellerName,
    findProductDefaults
} from '../utils/importNormalize';
import { UploadStep } from './SalesImport/UploadStep';
import { PreviewStep } from './SalesImport/PreviewStep';
import { ResolutionStep } from './SalesImport/ResolutionStep';
import { ManualMappingStep } from './SalesImport/ManualMappingStep';
import { SuccessStep } from './SalesImport/SuccessStep';
import { GroupingModal } from './SalesImport/GroupingModal';

export const SalesImportModal: React.FC<SalesImportModalProps> = ({ onClose, onImportSuccess }) => {
    const api = useApiScope();
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<ImportSession | null>(null);
    const [products, setProducts] = useState<string[]>([]);
    const [currencies, setCurrencies] = useState<string[]>([]);
    const [sellerAliases, setSellerAliases] = useState<Record<string, number>>({});
    const [allSellers, setAllSellers] = useState<Seller[]>([]);

    // Navegación de pasos
    const [step, setStep] = useState<ImportStep>('upload');
    const [missingVendors, setMissingVendors] = useState<VendorConfig[]>([]);

    // Mapeo manual de columnas
    const [manualRawData, setManualRawData] = useState<ManualRawData | null>(null);
    const [manualVendorCol, setManualVendorCol] = useState<number>(-1);
    const [manualSalesCol, setManualSalesCol] = useState<number>(-1);
    const [manualPrizesCol, setManualPrizesCol] = useState<number>(-1);
    const [manualSelectMode, setManualSelectMode] = useState<'vendor' | 'sales' | 'prizes'>('vendor');
    const [manualStartRow, setManualStartRow] = useState<number>(1);
    const [bulkCommission, setBulkCommission] = useState<number>(0);
    const [bulkParticipation, setBulkParticipation] = useState<number>(0);

    // Agrupación manual de vendedores
    const [selectedRowIndices, setSelectedRowIndices] = useState<number[]>([]);
    const [bulkTargetSeller, setBulkTargetSeller] = useState<string>('');
    const [bulkSaveAlias, setBulkSaveAlias] = useState<boolean>(true);
    const [isGroupingModalOpen, setIsGroupingModalOpen] = useState<boolean>(false);
    const [groupingSourceAgent, setGroupingSourceAgent] = useState<string>('');
    const [groupingTargetSeller, setGroupingTargetSeller] = useState<string>('');
    const [groupingCustomTarget, setGroupingCustomTarget] = useState<string>('');
    const [groupingSaveAlias, setGroupingSaveAlias] = useState<boolean>(true);

    const reloadCatalogs = async () => {
        try {
            const [prods, curs, aliases, sellers] = await Promise.all([
                getGlobalProducts().catch((err: any) => { console.error("Error cargando productos:", err); return []; }),
                getAvailableCurrencies().catch((err: any) => { console.error("Error cargando monedas:", err); return []; }),
                getSellerAliases().catch((err: any) => { console.error("Error cargando alias:", err); return {}; }),
                api.getSellers().catch((err: any) => { console.error("Error cargando vendedores:", err); return []; })
            ]);
            setProducts(prods);
            setCurrencies(curs);
            setSellerAliases(aliases);
            setAllSellers(sellers);
            return { prods, curs, aliases, sellers };
        } catch (error) {
            console.error("Error al cargar los catálogos del importador:", error);
            return { prods: [], curs: [], aliases: {}, sellers: [] };
        }
    };

    useEffect(() => {
        reloadCatalogs();
    }, []);

    // ─── Procesamiento y Lectura de Archivo ──────────────────────────────────────
    const processFile = async (file: File) => {
        setLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    if (!data) throw new Error("No se pudo leer el archivo");
                    const isCsv = file.name.toLowerCase().endsWith('.csv');
                    const workbook = XLSX.read(data, {
                        type: 'array',
                        codepage: 65001,
                        raw: isCsv
                    });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    const analysis = analyzeImportData(file.name, jsonData, sellerAliases, allSellers);
                    if (analysis.needsManualMapping || !analysis.session) {
                        setManualRawData({ fileName: file.name, data: jsonData });
                        setManualVendorCol(-1);
                        setManualSalesCol(-1);
                        setManualPrizesCol(-1);
                        setManualSelectMode('vendor');
                        setManualStartRow(analysis.headerRowIndex >= 0 ? analysis.headerRowIndex + 1 : 1);
                        setStep('manual');
                    } else {
                        setSession(analysis.session);
                        setStep('preview');
                    }
                } catch (error: any) {
                    console.error("Error al procesar el archivo:", error);
                    alert("Error al procesar el archivo: " + (error?.message || "Formato no válido"));
                } finally {
                    setLoading(false);
                }
            };
            reader.onerror = () => {
                setLoading(false);
                alert("Error al leer el archivo desde el disco");
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error(error);
            setLoading(false);
            alert("Error al abrir el archivo");
        }
    };

    // ─── Agrupación Manual de Filas ─────────────────────────────────────────────
    const handleApplyManualGroup = async (targetSellerName: string, indicesToUpdate: number[], saveAlias: boolean = true) => {
        if (!session || !targetSellerName.trim() || indicesToUpdate.length === 0) return;
        const cleanTarget = targetSellerName.trim().toUpperCase();
        const targetSellerObj = allSellers.find(s => s.name.trim().toUpperCase() === cleanTarget);

        const originalAgents = Array.from(new Set(
            indicesToUpdate.map(idx => session.rows[idx]?.vendorName?.trim()?.toUpperCase()).filter(Boolean)
        ));

        const updatedRows = session.rows.map((row, idx) => {
            if (indicesToUpdate.includes(idx)) {
                const existingSources: ConsolidatedSource[] = row.sources && row.sources.length > 0
                    ? row.sources
                    : [{
                        originalName: row.originalName || row.vendorName,
                        agencyName: row.agencyName,
                        sales: row.sales,
                        prizes: row.prizes,
                        isAliased: true
                    }];
                return {
                    ...row,
                    vendorName: cleanTarget,
                    isAliased: true,
                    originalName: row.originalName || row.vendorName,
                    sources: existingSources
                };
            }
            return row;
        });

        const consolidatedMap = new Map<string, RawRow>();
        for (const r of updatedRows) {
            const prod = normalizeProductName(r.productName || session.productName);
            const curr = normalizeCurrency(r.sourceRow?._currency || session.currency);
            const agency = (r.agencyName || '').trim().toUpperCase();
            const vend = r.vendorName.trim().toUpperCase();
            const key = `${vend}||${prod}||${agency}||${curr}`;
            const existing = consolidatedMap.get(key);
            if (existing) {
                existing.sales += r.sales;
                existing.prizes += r.prizes;
                if (r.sources && r.sources.length > 0) {
                    existing.sources = [...(existing.sources || []), ...r.sources];
                }
                if (r.isAliased) existing.isAliased = true;
            } else {
                consolidatedMap.set(key, {
                    ...r,
                    productName: prod,
                    sources: r.sources ? [...r.sources] : [{
                        originalName: r.originalName || r.vendorName,
                        agencyName: r.agencyName,
                        sales: r.sales,
                        prizes: r.prizes,
                        isAliased: r.isAliased
                    }],
                    sourceRow: {
                        ...(r.sourceRow || {}),
                        _currency: curr
                    }
                });
            }
        }
        const newRows = Array.from(consolidatedMap.values());
        setSession({ ...session, rows: newRows });
        setSelectedRowIndices([]);
        setBulkTargetSeller('');

        if (saveAlias && targetSellerObj) {
            for (const orig of originalAgents) {
                if (orig && orig !== cleanTarget) {
                    try {
                        await addSellerAlias(Number(targetSellerObj.id), orig);
                        setSellerAliases(prev => ({ ...prev, [orig]: Number(targetSellerObj.id) }));
                    } catch (err) {
                        console.warn(`No se pudo persistir el alias para ${orig}:`, err);
                    }
                }
            }
        }
    };

    /**
     * Convierte filas seleccionadas a Vendedores Independientes (Sin Grupo):
     * 1. Desvincula cualquier alias previo que asociaba a los usuarios/taquillas a su grupo anterior.
     * 2. Asigna a cada fila su propio agencyName (o vendorName si no tiene) como vendorName independiente.
     */
    const handleBulkMakeStandalone = async (indices: number[]) => {
        if (!session || indices.length === 0) return;

        const targets = Array.from(new Set(
            indices.map(idx => (session.rows[idx]?.agencyName || session.rows[idx]?.originalName || session.rows[idx]?.vendorName || '').trim().toUpperCase()).filter(Boolean)
        ));

        // 1. Desvincular alias de la base de datos
        for (const cleanName of targets) {
            try {
                const existingSeller = allSellers.find(s => s.name.trim().toUpperCase() === cleanName);
                if (existingSeller) {
                    await addSellerAlias(existingSeller.id, cleanName);
                    setSellerAliases(prev => ({ ...prev, [cleanName]: Number(existingSeller.id) }));
                } else {
                    await deleteSellerAlias(cleanName);
                    setSellerAliases(prev => {
                        const copy = { ...prev };
                        delete copy[cleanName];
                        return copy;
                    });
                }
            } catch (err) {
                console.warn("Aviso al desvincular alias:", err);
            }
        }

        // 2. Actualizar filas en la sesión
        const updatedRows = session.rows.map((row, idx) => {
            if (indices.includes(idx)) {
                const cleanName = (row.agencyName || row.originalName || row.vendorName).trim().toUpperCase();
                return {
                    ...row,
                    vendorName: cleanName,
                    originalName: cleanName,
                    isAliased: false,
                    sources: [{
                        originalName: cleanName,
                        agencyName: row.agencyName,
                        sales: row.sales,
                        prizes: row.prizes,
                        isAliased: false
                    }]
                };
            }
            return row;
        });

        // 3. Consolidar filas si aplica
        const consolidatedMap = new Map<string, RawRow>();
        for (const r of updatedRows) {
            const prod = (r.productName || session.productName).trim().toUpperCase();
            const curr = (r.sourceRow?._currency || session.currency).trim().toUpperCase();
            const agency = (r.agencyName || '').trim().toUpperCase();
            const vend = r.vendorName.trim().toUpperCase();
            const key = `${vend}||${prod}||${agency}||${curr}`;
            const existing = consolidatedMap.get(key);
            if (existing) {
                existing.sales += r.sales;
                existing.prizes += r.prizes;
                if (r.sources && r.sources.length > 0) {
                    existing.sources = [...(existing.sources || []), ...r.sources];
                }
            } else {
                consolidatedMap.set(key, { ...r, sources: r.sources ? [...r.sources] : [] });
            }
        }

        setSession({ ...session, rows: Array.from(consolidatedMap.values()) });
        setSelectedRowIndices([]);
    };

    /**
     * Convierte a una taquilla o agente en Vendedor Independiente (Sin Grupo) con 1 clic:
     */
    const handleMakeStandalone = async (standaloneName: string) => {
        if (!session || !standaloneName.trim()) return;
        const cleanName = standaloneName.trim().toUpperCase();

        const indicesToUpdate = session.rows
            .map((r, idx) => ((r.agencyName?.trim().toUpperCase() === cleanName) || (r.originalName?.trim().toUpperCase() === cleanName) || (r.vendorName.trim().toUpperCase() === cleanName)) ? idx : -1)
            .filter(idx => idx !== -1);

        if (indicesToUpdate.length === 0) return;

        await handleBulkMakeStandalone(indicesToUpdate);
        setIsGroupingModalOpen(false);
    };

    /**
     * Separa una taquilla específica de una fila consolidada con múltiples orígenes:
     */
    const handleSeparateSource = async (rowIndex: number, sourceIndex: number) => {
        if (!session || !session.rows[rowIndex]) return;
        const targetRow = session.rows[rowIndex];
        if (!targetRow.sources || targetRow.sources.length <= 1) return;

        const sourceToSeparate = targetRow.sources[sourceIndex];
        const cleanName = sourceToSeparate.originalName.trim().toUpperCase();

        // 1. Borrar alias en base de datos
        try {
            await deleteSellerAlias(cleanName);
            setSellerAliases(prev => {
                const copy = { ...prev };
                delete copy[cleanName];
                return copy;
            });
        } catch (err) {
            console.warn("Aviso al desvincular alias de taquilla separada:", err);
        }

        // 2. Modificar la fila original descontando este origen
        const remainingSources = targetRow.sources.filter((_, idx) => idx !== sourceIndex);
        const updatedTargetRow: RawRow = {
            ...targetRow,
            originalName: remainingSources.length === 1 ? remainingSources[0].originalName : targetRow.originalName,
            sales: roundFinance(Math.max(0, targetRow.sales - sourceToSeparate.sales)),
            prizes: roundFinance(Math.max(0, targetRow.prizes - sourceToSeparate.prizes)),
            sources: remainingSources,
            isAliased: remainingSources.some(s => s.isAliased)
        };

        // 3. Crear la nueva fila individual para la taquilla separada
        const newStandaloneRow: RawRow = {
            vendorName: cleanName,
            originalName: cleanName,
            agencyName: sourceToSeparate.agencyName,
            productName: targetRow.productName,
            sales: sourceToSeparate.sales,
            prizes: sourceToSeparate.prizes,
            isAliased: false,
            sources: [{
                originalName: cleanName,
                agencyName: sourceToSeparate.agencyName,
                sales: sourceToSeparate.sales,
                prizes: sourceToSeparate.prizes,
                isAliased: false
            }],
            sourceRow: { ...(targetRow.sourceRow || {}) }
        };

        const newRows = [...session.rows];
        newRows[rowIndex] = updatedTargetRow;
        newRows.push(newStandaloneRow);

        setSelectedRowIndices([]);
        setSession({ ...session, rows: newRows });
    };

    const handleApplyBulkPercentages = (comm: number, part: number) => {
        setMissingVendors(prev => prev.map(v => ({
            ...v,
            commissionPct: comm,
            partPct: part,
            products: v.products?.map(p => ({
                ...p,
                commissionPct: comm,
                partPct: part
            }))
        })));
    };

    const handleDeleteRow = (index: number) => {
        if (!session) return;
        const newRows = [...session.rows];
        newRows.splice(index, 1);
        setSession({ ...session, rows: newRows });
    };

    const handleRemoveMissingVendor = (index: number) => {
        const vendorToRemove = missingVendors[index];
        const newMissing = [...missingVendors];
        newMissing.splice(index, 1);
        setMissingVendors(newMissing);

        if (session) {
            const newRows = session.rows.filter(r => r.vendorName.trim().toUpperCase() !== vendorToRemove.name.trim().toUpperCase());
            setSession({ ...session, rows: newRows });
        }
    };

    const confirmManualMapping = () => {
        if (!manualRawData || manualVendorCol === -1 || manualSalesCol === -1) return;
        const { fileName, data } = manualRawData;

        const rows: RawRow[] = [];
        data.slice(manualStartRow).forEach((row: any[]) => {
            if (!Array.isArray(row)) return;
            const name = String(row[manualVendorCol] ?? '').trim().toUpperCase();
            if (!name || /^total/i.test(name) || name.startsWith('-')) return;

            let finalName = name;
            let isAliased = false;
            if (sellerAliases[name]) {
                const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[name]);
                if (mappedSeller) {
                    finalName = mappedSeller.name.toUpperCase();
                    isAliased = true;
                }
            }

            const salesVal = parseAmount(row[manualSalesCol]);
            const prizesVal = manualPrizesCol !== -1 ? parseAmount(row[manualPrizesCol]) : 0;
            if (salesVal === 0 && prizesVal === 0) return;

            const sourceItem: ConsolidatedSource = {
                originalName: name,
                sales: salesVal,
                prizes: prizesVal,
                isAliased
            };

            rows.push({
                vendorName: finalName,
                originalName: name,
                isAliased,
                sources: [sourceItem],
                sales: salesVal,
                prizes: prizesVal,
                sourceRow: row
            });
        });

        if (rows.length === 0) {
            alert('No se pudieron extraer filas con esos ajustes. Revisa la selección de columnas y la fila de inicio.');
            return;
        }

        const consolidated = new Map<string, RawRow>();
        for (const row of rows) {
            const key = row.vendorName.trim().toUpperCase();
            const existing = consolidated.get(key);
            if (existing) {
                existing.sales += row.sales;
                existing.prizes += row.prizes;
                if (row.sources && row.sources.length > 0) {
                    existing.sources = [...(existing.sources || []), ...row.sources];
                }
                if (row.isAliased) existing.isAliased = true;
            } else {
                consolidated.set(key, { ...row, sources: row.sources ? [...row.sources] : [] });
            }
        }

        setSession({
            fileName,
            productName: '',
            currency: 'DOLAR',
            date: new Date().toISOString().split('T')[0],
            rows: Array.from(consolidated.values()),
            detectedType: 'unknown'
        });
        setManualRawData(null);
        setStep('preview');
    };

    // ─── Validación de Vendedores y Detección de Duplicados ──────────────────────
    const validateVendors = async () => {
        if (!session) return;
        if (!session.productName || !session.productName.trim()) {
            alert("Por favor selecciona o escribe el Producto en la cabecera antes de continuar con la importación.");
            return;
        }
        setLoading(true);

        try {
            const allSales = await api.getSales();
            const currentDate = session.date;

            const nonDuplicateRows = session.rows.filter(row => {
                const vendorName = normalizeSellerName(row.vendorName);
                const rowProductName = normalizeProductName(row.productName || session.productName);
                const rowCurrency = normalizeCurrency(row.sourceRow?._currency || session.currency);
                const isDuplicate = allSales.some(sale =>
                    normalizeSellerName(sale.sellerName) === vendorName &&
                    normalizeProductName(sale.productName) === rowProductName &&
                    normalizeCurrency(sale.currencyName) === rowCurrency &&
                    sale.date === currentDate &&
                    (row.agencyName ? (normalizeSellerName(sale.agencyName) === normalizeSellerName(row.agencyName)) : true)
                );
                return !isDuplicate;
            });

            if (nonDuplicateRows.length < session.rows.length) {
                const duplicatesCount = session.rows.length - nonDuplicateRows.length;
                alert(`Atención: Se omitieron ${duplicatesCount} registros que ya existen en el sistema para la fecha ${currentDate}.`);
            }

            if (nonDuplicateRows.length === 0) {
                alert("Todos los registros del archivo ya han sido importados previamente para esta fecha.");
                setLoading(false);
                return;
            }

            const newSession = { ...session, rows: nonDuplicateRows };
            setSession(newSession);

            const currentSellers = await api.getSellers();
            setAllSellers(currentSellers);

            // Agrupar filas por vendedor normalizado
            const vendorRowsMap = new Map<string, typeof nonDuplicateRows>();
            for (const r of nonDuplicateRows) {
                const vName = normalizeSellerName(r.vendorName);
                if (!vendorRowsMap.has(vName)) {
                    vendorRowsMap.set(vName, []);
                }
                vendorRowsMap.get(vName)!.push(r);
            }

            const missingVendorsList: VendorConfig[] = [];

            for (const [vendorName, rows] of vendorRowsMap.entries()) {
                const existingSeller = currentSellers.find(s => normalizeSellerName(s.name) === vendorName);

                // Obtener todos los productos y monedas requeridos por este vendedor en este archivo
                const requiredCombos = new Map<string, { productName: string; currency: string }>();
                for (const r of rows) {
                    const prodName = normalizeProductName(r.productName || session.productName);
                    const currName = normalizeCurrency(r.sourceRow?._currency || session.currency);
                    const comboKey = `${prodName}|${currName}`;
                    if (!requiredCombos.has(comboKey)) {
                        requiredCombos.set(comboKey, { productName: prodName, currency: currName });
                    }
                }

                const pendingProducts: {
                    productName: string;
                    currency: string;
                    commissionPct: number;
                    partPct: number;
                    isConfiguredInDb: boolean;
                }[] = [];

                for (const { productName: reqProd, currency: reqCurr } of requiredCombos.values()) {
                    let isConfigured = false;
                    let commPct = 0;
                    let partPct = 0;

                    if (existingSeller) {
                        const sellerProd = existingSeller.products?.find(p => normalizeProductName(p.name) === reqProd);
                        const currConfig = sellerProd?.currencies?.find(c => normalizeCurrency(String(c.name || c.id)) === reqCurr);

                        if (currConfig) {
                            isConfigured = true;
                            commPct = Number(currConfig.commissionPct ?? 0);
                            partPct = Number(currConfig.partPct ?? 0);
                        } else if (sellerProd && sellerProd.currencies && sellerProd.currencies.length > 0) {
                            // Mismo producto en otra moneda: usar sus porcentajes como base sugerida
                            const baseCurr = sellerProd.currencies[0];
                            commPct = Number(baseCurr.commissionPct ?? 0);
                            partPct = Number(baseCurr.partPct ?? 0);
                        }
                    }

                    if (!isConfigured && commPct === 0 && partPct === 0) {
                        const def = findProductDefaults(reqProd);
                        commPct = def.commissionPct;
                        partPct = def.partPct;
                    }

                    pendingProducts.push({
                        productName: reqProd,
                        currency: reqCurr,
                        commissionPct: commPct,
                        partPct: partPct,
                        isConfiguredInDb: isConfigured
                    });
                }

                // SIEMPRE incluir a cada vendedor para que el usuario pueda ver, asignar o ajustar porcentajes
                const defs = findProductDefaults(session.productName);
                missingVendorsList.push({
                    name: vendorName,
                    isExisting: !!existingSeller,
                    mappedSellerId: existingSeller ? Number(existingSeller.id) : null,
                    commissionPct: pendingProducts[0]?.commissionPct ?? defs.commissionPct,
                    partPct: pendingProducts[0]?.partPct ?? defs.partPct,
                    products: pendingProducts
                });
            }

            if (missingVendorsList.length > 0) {
                const activeProd = normalizeProductName(session.productName);
                const prodDefaults = findProductDefaults(activeProd);
                setBulkCommission(prodDefaults.commissionPct);
                setBulkParticipation(prodDefaults.partPct);

                setMissingVendors(missingVendorsList);
                setStep('resolution');
            } else {
                await executeImport(newSession);
            }
        } catch (error: any) {
            console.error(error);
            alert(`Error al validar los registros de la importación: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    // ─── Creación y Mapeo de Vendedores Nuevos ───────────────────────────────────
    const createAndImportSellers = async () => {
        if (!session || loading) return;
        setLoading(true);

        try {
            let updatedSession = { ...session, rows: [...session.rows] };
            let currentSellers = await api.getSellers();
            const vendorOverrides = new Map<string, { commissionPct: number; partPct: number }>();

            for (const v of missingVendors) {
                const normVendorName = normalizeSellerName(v.name);
                const vendorRows = updatedSession.rows.filter(r => normalizeSellerName(r.vendorName) === normVendorName);
                const userCommPct = Number(v.commissionPct ?? 0);
                const userPartPct = Number(v.partPct ?? 0);

                if (v.mappedSellerId) {
                    await addSellerAlias(v.mappedSellerId, v.name);

                    const mappedSeller = currentSellers.find(s => Number(s.id) === v.mappedSellerId);
                    if (mappedSeller) {
                        const targetName = mappedSeller.name.toUpperCase();
                        updatedSession.rows = updatedSession.rows.map(r =>
                            normalizeSellerName(r.vendorName) === normVendorName
                                ? { ...r, vendorName: targetName }
                                : r
                        );

                        // Registrar override para este vendedor y su alias
                        vendorOverrides.set(normVendorName, { commissionPct: userCommPct, partPct: userPartPct });
                        vendorOverrides.set(normalizeSellerName(targetName), { commissionPct: userCommPct, partPct: userPartPct });

                        let needsUpdate = false;
                        const productsToConfigure = (v.products && v.products.length > 0)
                            ? v.products
                            : Array.from(new Set(vendorRows.map(r => normalizeProductName(r.productName || session.productName)))).map(pName => ({
                                productName: pName,
                                currency: normalizeCurrency(session.currency),
                                commissionPct: userCommPct,
                                partPct: userPartPct
                            }));

                        if (!mappedSeller.products) mappedSeller.products = [];

                        for (const item of productsToConfigure) {
                            const prodName = normalizeProductName(item.productName);
                            const prodId = `p-${prodName.toLowerCase().replace(/\s/g, '-')}`;
                            let product = mappedSeller.products.find(p => normalizeProductName(p.name) === prodName);
                            if (!product) {
                                product = { id: prodId, name: prodName, currencies: [] };
                                mappedSeller.products.push(product);
                                needsUpdate = true;
                            }

                            const currName = normalizeCurrency(item.currency);
                            let currencyConfig = product.currencies.find(c => normalizeCurrency(String(c.name || c.id)) === currName);
                            const itemComm = Number(item.commissionPct ?? userCommPct);
                            const itemPart = Number(item.partPct ?? userPartPct);

                            if (!currencyConfig) {
                                product.currencies.push({
                                    id: currName,
                                    name: currName,
                                    commissionPct: itemComm,
                                    partPct: itemPart
                                });
                                needsUpdate = true;
                            } else {
                                currencyConfig.commissionPct = itemComm;
                                currencyConfig.partPct = itemPart;
                                needsUpdate = true;
                            }
                        }

                        if (needsUpdate) {
                            await api.updateSeller(mappedSeller);
                        }
                    }
                    continue;
                }

                const existingSeller = currentSellers.find(s => normalizeSellerName(s.name) === normVendorName);

                vendorOverrides.set(normVendorName, { commissionPct: userCommPct, partPct: userPartPct });

                if (existingSeller) {
                    let needsUpdate = false;
                    const productsToConfigure = (v.products && v.products.length > 0)
                        ? v.products
                        : Array.from(new Set(vendorRows.map(r => normalizeProductName(r.productName || session.productName)))).map(pName => ({
                            productName: pName,
                            currency: normalizeCurrency(session.currency),
                            commissionPct: userCommPct,
                            partPct: userPartPct
                        }));

                    if (!existingSeller.products) existingSeller.products = [];

                    for (const item of productsToConfigure) {
                        const prodName = normalizeProductName(item.productName);
                        const prodId = `p-${prodName.toLowerCase().replace(/\s/g, '-')}`;
                        let product = existingSeller.products.find(p => normalizeProductName(p.name) === prodName);
                        if (!product) {
                            product = { id: prodId, name: prodName, currencies: [] };
                            existingSeller.products.push(product);
                            needsUpdate = true;
                        }

                        const currName = normalizeCurrency(item.currency);
                        let currencyConfig = product.currencies.find(c => normalizeCurrency(String(c.name || c.id)) === currName);
                        const itemComm = Number(item.commissionPct ?? userCommPct);
                        const itemPart = Number(item.partPct ?? userPartPct);

                        if (!currencyConfig) {
                            product.currencies.push({
                                id: currName,
                                name: currName,
                                commissionPct: itemComm,
                                partPct: itemPart
                            });
                            needsUpdate = true;
                        } else {
                            currencyConfig.commissionPct = itemComm;
                            currencyConfig.partPct = itemPart;
                            needsUpdate = true;
                        }
                    }

                    if (needsUpdate) {
                        await api.updateSeller(existingSeller);
                    }
                } else {
                    const productsToConfigure = (v.products && v.products.length > 0)
                        ? v.products
                        : Array.from(new Set(vendorRows.map(r => normalizeProductName(r.productName || session.productName)))).map(pName => ({
                            productName: pName,
                            currency: normalizeCurrency(session.currency),
                            commissionPct: userCommPct,
                            partPct: userPartPct
                        }));

                    const prodsMap = new Map<string, { id: string; name: string; currencies: any[] }>();
                    for (const item of productsToConfigure) {
                        const pName = normalizeProductName(item.productName);
                        const currName = normalizeCurrency(item.currency);
                        const itemComm = Number(item.commissionPct ?? userCommPct);
                        const itemPart = Number(item.partPct ?? userPartPct);

                        if (!prodsMap.has(pName)) {
                            prodsMap.set(pName, {
                                id: `p-${pName.toLowerCase().replace(/\s/g, '-')}`,
                                name: pName,
                                currencies: []
                            });
                        }
                        const pObj = prodsMap.get(pName)!;
                        if (!pObj.currencies.some(c => normalizeCurrency(c.name || c.id) === currName)) {
                            pObj.currencies.push({
                                id: currName,
                                name: currName,
                                commissionPct: itemComm,
                                partPct: itemPart
                            });
                        }
                    }

                    const created = await api.addSeller({
                        name: normVendorName,
                        products: Array.from(prodsMap.values())
                    });
                    currentSellers.push(created);
                }
            }

            await reloadCatalogs();
            setSession(updatedSession);
            await executeImport(updatedSession, vendorOverrides);
        } catch (error: any) {
            console.error(error);
            alert(`Error durante la importación: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    // ─── Ejecución Final de la Importación ────────────────────────────────────────
    const executeImport = async (
        validSession?: ImportSession,
        vendorOverrides?: Map<string, { commissionPct: number; partPct: number }>
    ) => {
        const activeSession = validSession || session;
        if (!activeSession) return;
        setLoading(true);

        try {
            const allSessionProducts = Array.from(new Set(
                activeSession.rows
                    .map(r => normalizeProductName(r.productName || activeSession.productName))
                    .filter(Boolean)
            ));
            if (activeSession.productName) {
                allSessionProducts.push(normalizeProductName(activeSession.productName));
            }

            const currentGlobal = await getGlobalProducts();
            const currentGlobalUpper = currentGlobal.map(p => normalizeProductName(p));

            for (const prodName of allSessionProducts) {
                if (!currentGlobalUpper.includes(prodName)) {
                    await addGlobalProduct(prodName);
                    currentGlobalUpper.push(prodName);
                }
            }

            const currentSellers = await api.getSellers();
            let allAgencies: Agency[] = [];
            try {
                allAgencies = await getAgencies();
            } catch (err) {
                console.warn("No se pudieron cargar agencias existentes:", err);
            }

            const weekId = dateToWeekId(activeSession.date);

            for (const row of activeSession.rows) {
                const normVendor = normalizeSellerName(row.vendorName);
                const origVendor = row.originalName ? normalizeSellerName(row.originalName) : '';
                const seller = currentSellers.find(s => normalizeSellerName(s.name) === normVendor);
                if (!seller) continue;

                const rowProductName = normalizeProductName(row.productName || activeSession.productName);
                const rowCurrency = normalizeCurrency(row.sourceRow?._currency || activeSession.currency);

                let product = seller.products?.find(p =>
                    normalizeProductName(p.name) === rowProductName
                );

                let currencyConfig = product?.currencies?.find(c =>
                    normalizeCurrency(String(c.name || c.id)) === rowCurrency
                );

                // Prioridad de porcentajes:
                // 1) Override explícito confirmado por el usuario en la resolución
                // 2) Configuración existente en BD para este vendedor, producto y moneda
                // 3) Defaults por producto
                const override = vendorOverrides?.get(normVendor) || (origVendor ? vendorOverrides?.get(origVendor) : undefined);
                const defaultPercentages = findProductDefaults(rowProductName);

                const comPct = override !== undefined
                    ? override.commissionPct
                    : (currencyConfig ? Number(currencyConfig.commissionPct ?? 0) : defaultPercentages.commissionPct);

                const partPct = override !== undefined
                    ? override.partPct
                    : (currencyConfig ? Number(currencyConfig.partPct ?? 0) : defaultPercentages.partPct);

                const comision = roundFinance(row.sales * (comPct / 100));
                const neto = roundFinance(row.sales - row.prizes - comision);
                const participacion = roundFinance(neto * (partPct / 100));

                let agencyId: string | number | undefined = undefined;
                if (row.agencyName) {
                    const normAgency = normalizeSellerName(row.agencyName);
                    const existingAgency = allAgencies.find(a =>
                        normalizeSellerName(a.name) === normAgency &&
                        String(a.sellerId) === String(seller.id)
                    );
                    if (existingAgency) {
                        agencyId = existingAgency.id;
                    } else {
                        try {
                            const newAgency = await addAgency({
                                name: row.agencyName,
                                sellerId: seller.id,
                                sellerName: seller.name
                            });
                            agencyId = newAgency.id;
                            allAgencies.push(newAgency);
                        } catch (err) {
                            console.warn("No se pudo crear automáticamente la agencia:", err);
                        }
                    }
                }

                await api.addSale({
                    sellerId: String(seller.id),
                    sellerName: seller.name,
                    agencyId: agencyId,
                    agencyName: row.agencyName,
                    productId: product ? product.id : `p-${rowProductName.toLowerCase().replace(/\s/g, '-')}`,
                    productName: rowProductName,
                    currencyId: currencyConfig ? currencyConfig.id : rowCurrency,
                    currencyName: rowCurrency,
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
            await reloadCatalogs();
            onImportSuccess();
        } catch (error: any) {
            console.error(error);
            alert(`Error durante la importación: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setSession(null);
        setStep('upload');
        setMissingVendors([]);
        setManualRawData(null);
        setManualVendorCol(-1);
        setManualSalesCol(-1);
        setManualPrizesCol(-1);
        setSelectedRowIndices([]);
        setBulkTargetSeller('');
        reloadCatalogs();
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
                        <UploadStep
                            onFileSelected={processFile}
                            loading={loading}
                        />
                    )}

                    {step === 'preview' && session && (
                        <PreviewStep
                            session={session}
                            setSession={setSession}
                            products={products}
                            currencies={currencies}
                            allSellers={allSellers}
                            selectedRowIndices={selectedRowIndices}
                            setSelectedRowIndices={setSelectedRowIndices}
                            bulkTargetSeller={bulkTargetSeller}
                            setBulkTargetSeller={setBulkTargetSeller}
                            bulkSaveAlias={bulkSaveAlias}
                            setBulkSaveAlias={setBulkSaveAlias}
                            onApplyManualGroup={handleApplyManualGroup}
                            onBulkMakeStandalone={handleBulkMakeStandalone}
                            onSeparateSource={handleSeparateSource}
                            onOpenGroupingModal={(vendorName) => {
                                const vendor = vendorName || (session.rows[0]?.vendorName || '');
                                setGroupingSourceAgent(vendor);
                                setGroupingTargetSeller('');
                                setGroupingCustomTarget('');
                                setGroupingSaveAlias(true);
                                setIsGroupingModalOpen(true);
                            }}
                            onDeleteRow={handleDeleteRow}
                            onCancel={reset}
                            onValidateAndImport={validateVendors}
                            loading={loading}
                        />
                    )}

                    {step === 'resolution' && (
                        <ResolutionStep
                            missingVendors={missingVendors}
                            setMissingVendors={setMissingVendors}
                            allSellers={allSellers}
                            session={session}
                            bulkCommission={bulkCommission}
                            setBulkCommission={setBulkCommission}
                            bulkParticipation={bulkParticipation}
                            setBulkParticipation={setBulkParticipation}
                            onApplyBulkPercentages={handleApplyBulkPercentages}
                            onRemoveMissingVendor={handleRemoveMissingVendor}
                            onBack={reset}
                            onSubmit={createAndImportSellers}
                            loading={loading}
                        />
                    )}

                    {step === 'manual' && manualRawData && (
                        <ManualMappingStep
                            manualRawData={manualRawData}
                            manualVendorCol={manualVendorCol}
                            setManualVendorCol={setManualVendorCol}
                            manualSalesCol={manualSalesCol}
                            setManualSalesCol={setManualSalesCol}
                            manualPrizesCol={manualPrizesCol}
                            setManualPrizesCol={setManualPrizesCol}
                            manualSelectMode={manualSelectMode}
                            setManualSelectMode={setManualSelectMode}
                            manualStartRow={manualStartRow}
                            setManualStartRow={setManualStartRow}
                            onCancel={reset}
                            onConfirm={confirmManualMapping}
                        />
                    )}

                    {step === 'success' && (
                        <SuccessStep
                            onClose={onClose}
                            onReset={reset}
                        />
                    )}
                </div>

                {/* Submodal de Agrupación Manual */}
                {session && (
                    <GroupingModal
                        isOpen={isGroupingModalOpen}
                        onClose={() => setIsGroupingModalOpen(false)}
                        sourceAgent={groupingSourceAgent}
                        setSourceAgent={setGroupingSourceAgent}
                        allAgents={Array.from(new Set(session.rows.map(r => r.vendorName)))}
                        allSellers={allSellers}
                        targetSeller={groupingTargetSeller}
                        setTargetSeller={setGroupingTargetSeller}
                        customTarget={groupingCustomTarget}
                        setCustomTarget={setGroupingCustomTarget}
                        saveAlias={groupingSaveAlias}
                        setSaveAlias={setGroupingSaveAlias}
                        onConfirm={() => {
                            const target = (groupingTargetSeller || groupingCustomTarget).trim().toUpperCase();
                            if (!target) return;
                            const matchingIndices = session.rows
                                .map((r, idx) => r.vendorName.trim().toUpperCase() === groupingSourceAgent.trim().toUpperCase() ? idx : -1)
                                .filter(idx => idx !== -1);
                            handleApplyManualGroup(target, matchingIndices, groupingSaveAlias);
                            setIsGroupingModalOpen(false);
                        }}
                        onMakeStandalone={handleMakeStandalone}
                    />
                )}
            </div>
        </div>
    );
};
