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
    Percent,
    Trash2
} from 'lucide-react';
import {
    getGlobalProducts,
    addGlobalProduct,
    getAvailableCurrencies,
    dateToWeekId,
    getSellerAliases,
    addSellerAlias,
    Seller
} from '../services/apiService';
import { useApiScope } from '../hooks/useApiScope';
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
    detectedType: 'betm3' | 'banklot' | 'maxplay' | 'americanas' | 'mastergreen' | 'unknown';
}

interface VendorConfig {
    name: string;
    commissionPct: number;
    partPct: number;
    mappedSellerId?: number | null;
    isExisting?: boolean;
}

interface SalesImportModalProps {
    onClose: () => void;
    onImportSuccess: () => void;
}

export const SalesImportModal: React.FC<SalesImportModalProps> = ({ onClose, onImportSuccess }) => {
    const api = useApiScope();
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<ImportSession | null>(null);
    const [products, setProducts] = useState<string[]>([]);
    const [currencies, setCurrencies] = useState<string[]>([]);
    const [sellerAliases, setSellerAliases] = useState<Record<string, number>>({});
    const [allSellers, setAllSellers] = useState<Seller[]>([]);

    // UI State
    const [step, setStep] = useState<'upload' | 'preview' | 'resolution' | 'success'>('upload');
    const [missingVendors, setMissingVendors] = useState<VendorConfig[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                const [prods, curs, aliases, sellers] = await Promise.all([
                    getGlobalProducts().catch(err => { console.error("Error cargando productos globales:", err); return []; }), 
                    getAvailableCurrencies().catch(err => { console.error("Error cargando monedas disponibles:", err); return []; }),
                    getSellerAliases().catch(err => { console.error("Error cargando alias de vendedores:", err); return {}; }),
                    api.getSellers().catch(err => { console.error("Error cargando vendedores:", err); return []; })
                ]);
                setProducts(prods);
                setCurrencies(curs);
                setSellerAliases(aliases);
                setAllSellers(sellers);
            } catch (error) {
                console.error("Error al cargar los catálogos del importador:", error);
            }
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
                const isCsv = file.name.toLowerCase().endsWith('.csv');
                const workbook = XLSX.read(data, { 
                    type: 'binary',
                    raw: isCsv
                });
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

    /**
     * Parser para el formato AMERICANAS.
     * La celda «Nombre» contiene: "BS EL MUÑECO - GRANDE (W DEPORTES)"
     *   - Prefijo moneda : "BS" → BOLIVARES VENEZOLANOS   |  "$" → DOLAR
     *   - Vendedor       : "EL MUÑECO"
     *   - Agencia/Grupo  : "GRANDE"  (entre " - " y " (")
     *   - Operadora      : "W DEPORTES" (dentro de paréntesis)
     * Retorna null si la celda no coincide con el patrón.
     */
    const parseAmericanasName = (raw: string, defaultCurrency: string = 'DOLAR'): { currency: string; vendorName: string; grupo: string; operadora: string } | null => {
        const s = raw.trim();
        // Detectar prefijo de moneda al inicio.
        // Acepta tanto con espacio ("BS EL MUÑECO") como pegado ("BSEL MUÑECO" / "$EL MUÑECO")
        let currency = '';
        let rest = s;
        if (/^BS\s*/i.test(s)) {
            currency = 'BOLIVARES VENEZOLANOS';
            rest = s.replace(/^BS\s*/i, '');
        } else if (/^\$\s*/.test(s)) {
            currency = 'DOLAR';
            rest = s.replace(/^\$\s*/, '');
        } else {
            // Si no tiene prefijo, no descartamos la agencia, usamos el default deducido del archivo
            currency = defaultCurrency;
            rest = s;
        }

        if (!rest) return null;

        // Extraer todos los grupos entre paréntesis → operadora
        let operadora = '';
        let remaining = rest;
        const parenParts: string[] = [];
        const parenGlobal = /\(([^)]+)\)/g;
        let m: RegExpExecArray | null;
        while ((m = parenGlobal.exec(rest)) !== null) {
            parenParts.push(m[1].trim().toUpperCase());
        }
        if (parenParts.length > 0) {
            operadora = parenParts.join(' / ');
            remaining = rest.replace(/\s*\([^)]*\)/g, '').trim();
        }

        // Limpiar puntos/guiones/espacios al final de lo que queda
        remaining = remaining.replace(/[\s.\-]+$/, '').trim();

        // Separar vendedor y grupo.
        // El separador puede ser ".- " (punto-guión-espacio) o " - " (espacio-guión-espacio).
        // Usamos regex que captura el PRIMER separador de este tipo.
        const sepRegex = /\s*\.-\s*|\s+-\s+/;
        const sepMatch = sepRegex.exec(remaining);
        let vendorName = '';
        let grupo = '';
        if (sepMatch && sepMatch.index !== undefined) {
            vendorName = remaining.substring(0, sepMatch.index).trim().toUpperCase();
            grupo = remaining.substring(sepMatch.index + sepMatch[0].length).trim().toUpperCase();
        } else {
            vendorName = remaining.trim().toUpperCase();
        }

        // Limpiar sufijos ".-" residuales del vendorName
        vendorName = vendorName.replace(/[\s.\-]+$/, '').trim();

        if (!vendorName) return null;
        return { currency, vendorName, grupo, operadora };
    };

    /**
     * Parser para el formato MASTERGREEN / WORLDDEPORTES.
     * La primera columna «Taquillas» contiene: "paquejuancho Usd" o "cruces Bs"
     *   - Nombre vendedor : todo menos el sufijo de moneda
     *   - Moneda          : "Usd" → DOLAR  |  "Bs" → BOLIVARES VENEZOLANOS
     * Los montos ya vienen en formato europeo (242.600,00) que parseAmount maneja.
     * Si hay filas con ambas monedas, se crean entradas separadas por moneda.
     */
    const parseMastergreenName = (raw: string): { currency: string; vendorName: string } | null => {
        const s = raw.trim();
        // Sufijo al final: " Usd", " usd", " Bs", " bs" (con o sin espacio antes)
        const match = s.match(/^(.+?)\s+(Usd|USD|Bs|BS|bs|usd)$/i);
        if (!match) return null;
        const name = match[1].trim().toUpperCase();
        const currencyRaw = match[2].toUpperCase();
        if (!name) return null;
        const currency = currencyRaw === 'BS' ? 'BOLIVARES VENEZOLANOS' : 'DOLAR';
        return { vendorName: name, currency };
    };

    const analyzeAndCreateSession = (fileName: string, data: any[][]) => {
        let detectedType: ImportSession['detectedType'] = 'unknown';
        let rows: RawRow[] = [];
        let productName = "";
        let forcedCurrency: string | null = null;

        const fileNameUpper = fileName.toUpperCase();
        const contentStr = JSON.stringify(data.slice(0, 15)).toUpperCase();

        // ─── Detección formato MASTERGREEN / WORLDDEPORTES ────────────────────
        // Aplica a archivos que contengan "MASTERGREEN" en el nombre, o cuyo
        // contenido tenga la cabecera "Taquillas" con sufijos "Usd" / "Bs".
        const isMastergreen = fileNameUpper.includes('MASTERGREEN') || fileNameUpper.includes('WORLDDEPORTES');
        if (isMastergreen) {
            detectedType = 'mastergreen';
            // Producto: tomamos de la cabecera del archivo si viene en el nombre
            productName = 'WORLDDEPORTES';

            // Buscar fila de encabezado con columna "Taquillas"
            let taqIdx = -1, salesIdx = -1, prizesIdx = -1;
            let headerRowIndex = -1;

            for (let i = 0; i < Math.min(data.length, 10); i++) {
                const row = data[i];
                if (!row || !Array.isArray(row)) continue;
                const tIdx = row.findIndex((c: any) => typeof c === 'string' && /^(taquillas?|agentes?)$/i.test(String(c).trim()));
                if (tIdx !== -1) {
                    taqIdx = tIdx;
                    headerRowIndex = i;
                    // Buscar columna de ventas: primera columna con /venta/i después de Taquillas
                    const vIdx = row.findIndex((c: any, j: number) => j > tIdx && typeof c === 'string' && /venta/i.test(c));
                    salesIdx = vIdx !== -1 ? vIdx : taqIdx + 1;
                    // Buscar columna de premios: primera columna con /premio/i
                    const pIdx = row.findIndex((c: any, j: number) => j > taqIdx && typeof c === 'string' && /premio/i.test(c));
                    prizesIdx = pIdx !== -1 ? pIdx : -1;
                    break;
                }
            }

            if (taqIdx !== -1) {
                // Agrupar por vendedor+moneda
                const consolidatedMG = new Map<string, RawRow>();

                data.slice(headerRowIndex + 1).forEach((row: any[]) => {
                    const raw = String(row[taqIdx] ?? '').trim();
                    if (!raw) return;
                    // Ignorar filas de totales
                    if (/^total/i.test(raw)) return;

                    const parsed = parseMastergreenName(raw);
                    if (!parsed) return;

                    const { vendorName, currency } = parsed;

                    // Resolver alias si existe
                    let finalName = vendorName;
                    const rawKey = vendorName.trim().toUpperCase();
                    if (sellerAliases[rawKey]) {
                        const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawKey]);
                        if (mappedSeller) finalName = mappedSeller.name.toUpperCase();
                    }

                    const salesVal  = salesIdx  !== -1 ? parseAmount(row[salesIdx])  : 0;
                    const prizesVal = prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0;
                    if (salesVal === 0 && prizesVal === 0) return;

                    const key = `${finalName}||${currency}`;
                    const existing = consolidatedMG.get(key);
                    if (existing) {
                        existing.sales  += salesVal;
                        existing.prizes += prizesVal;
                    } else {
                        consolidatedMG.set(key, {
                            vendorName: finalName,
                            sales:  salesVal,
                            prizes: prizesVal,
                            sourceRow: { ...row, _currency: currency }
                        });
                    }
                });

                const mgRows = Array.from(consolidatedMG.values());

                if (mgRows.length === 0) {
                    alert("No se pudo leer ninguna taquilla en el archivo MASTERGREEN. Verifica que el formato sea correcto.");
                    return;
                }

                // Detectar moneda predominante para la sesión
                // Si hay mezcla (Bs + Usd), usamos DOLAR como moneda de sesión
                // pero las filas conservan su moneda en sourceRow._currency
                const hasBs  = mgRows.some(r => r.sourceRow._currency === 'BOLIVARES VENEZOLANOS');
                const hasUsd = mgRows.some(r => r.sourceRow._currency === 'DOLAR');
                const sessionCurrency = (hasBs && !hasUsd) ? 'BOLIVARES VENEZOLANOS' : 'DOLAR';

                setSession({
                    fileName,
                    productName,
                    currency: sessionCurrency,
                    date: new Date().toISOString().split('T')[0],
                    rows: mgRows,
                    detectedType
                });
                setStep('preview');
                return; // Salida anticipada para MASTERGREEN
            }
        }
        // ──────────────────────────────────────────────────────────────────────

        // ─── Detección formato AMERICANAS / Report Hipódromo ──────────────────
        // Nombres canónicos definidos por el usuario:
        //   • "Report $.xls"   → dólares   (DOLAR)
        //   • "Report Bs.xls"  → bolívares (BOLIVARES VENEZOLANOS)
        //   • "Report.xls"     → dólares   (DOLAR)  ← sin sufijo = dólar por defecto
        //
        // También aplica a variantes: AMERICANAS $.xlsx, AMERICANAS BS.xlsx,
        //   Report DOLARES.xls, Report BOLIVARES.xls, etc.
        //
        // Detección explícita por nombre exacto (máxima prioridad):
        const isExactReportDolar = fileNameUpper === 'REPORT $.XLS' || fileNameUpper === 'REPORT.XLS';
        const isExactReportBs    = fileNameUpper === 'REPORT BS.XLS';

        const isReportFile = fileNameUpper.includes('REPORT');
        const isAmericanas = fileNameUpper.includes('AMERICANAS') ||
            isExactReportDolar ||
            isExactReportBs ||
            (isReportFile && (
                fileNameUpper.includes('DOLAR') ||
                fileNameUpper.includes('BOLIVAR') ||
                fileNameUpper.includes('$') ||
                // «BS» como abreviatura de bolívares en el nombre del archivo
                // \s+BS\s+ o al final antes de la extensión: " BS."
                /[\s_\-]BS[\s_\-\.]/i.test(fileNameUpper) ||
                /[\s_\-]BS$/i.test(fileNameUpper)
            ));
        if (isAmericanas) {
            detectedType = 'americanas';
            productName = 'AMERICANAS';
            // Determinar moneda por el nombre del archivo — orden de prioridad:
            //   1. Nombre exacto canónico  2. Contiene BOLIVAR/BS  3. Por defecto: DOLAR
            const isBsFile = isExactReportBs ||
                fileNameUpper.includes('BOLIVAR') ||
                /[\s_\-]BS[\s_\-\.]/i.test(fileNameUpper) ||
                /[\s_\-]BS$/i.test(fileNameUpper);
            forcedCurrency = isBsFile ? 'BOLIVARES VENEZOLANOS' : 'DOLAR';
        }

        // 1. Detectar el nombre del producto sugerido basado en el contenido del archivo
        if (!productName) {
            if (contentStr.includes("BETM3")) productName = "PARLEY BETM3";
            else if (contentStr.includes("LOTOREY") || contentStr.includes("LOTERIAS") || contentStr.includes("BANKLOT")) productName = "LOTERIAS";
            else if (contentStr.includes("MAXPLAY")) productName = "MAXPLAY";
            else if (contentStr.includes("GALILEO")) productName = "GALILEO";
            else if (contentStr.includes("POSNET")) productName = "POSNET";
            else if (contentStr.includes("GATO")) productName = "GATO";
            else if (contentStr.includes("INMEJORABLE") || contentStr.includes("PARLEY")) productName = "PARLEY";
        }

        // ─── Parser especial para AMERICANAS ───────────────────────────────────
        if (isAmericanas) {
            // Buscar la columna «Nombre» y las columnas numéricas (Venta, Premio, etc.)
            let vendorIdx = -1, salesIdx = -1, prizesIdx = -1;
            let headerRowIndex = -1;

            for (let i = 0; i < Math.min(data.length, 30); i++) {
                const row = data[i];
                if (!row || !Array.isArray(row)) continue;
                const vIdx = row.findIndex((c: any) => typeof c === 'string' && /venta/i.test(c));
                const pIdx = row.findIndex((c: any) => typeof c === 'string' && /premio|pagado|pago/i.test(c));
                const nIdx = row.findIndex((c: any) => typeof c === 'string' && /nombre/i.test(c));
                if (vIdx !== -1 && nIdx !== -1) {
                    // ── FIX #2: Celdas combinadas en Report .xls ──────────────────────────
                    // En archivos con muchas celdas combinadas (p.ej. Report $.xls),
                    // los encabezados "Nombre" y "Venta" pueden estar en col N, pero los
                    // datos reales están en col N-1 (inicio del rango combinado). Esto
                    // hace que la búsqueda de sampleDataRow falle usando nIdx, porque en
                    // las filas de datos el nombre está en nIdx-1.
                    // Solución: buscar la muestra revisando también columnas adyacentes.
                    let realSalesIdx = vIdx;
                    let realPrizesIdx = pIdx;
                    let realVendorIdx = nIdx;
                    const testRows = data.slice(i + 1, i + 100);

                    // 1. Buscar la columna real del nombre de la agencia (vendorIdx)
                    let sampleVendorCol = nIdx;
                    for (const colOffset of [0, -1, 1, -2, 2]) {
                        const checkCol = nIdx + colOffset;
                        if (checkCol < 0) continue;
                        const found = testRows.find((r: any[]) => {
                            if (!r || !Array.isArray(r)) return false;
                            const nameSample = String(r[checkCol] ?? '').trim();
                            return nameSample.length > 3 &&
                                !/^nombre$/i.test(nameSample) &&
                                !/^total/i.test(nameSample) &&
                                /^[\w$\u00C0-\u024F]/i.test(nameSample);
                        });
                        if (found) {
                            sampleVendorCol = checkCol;
                            break;
                        }
                    }
                    realVendorIdx = sampleVendorCol;

                    // 2. Votación de columna para Ventas (salesIdx) y Premios (prizesIdx)
                    // Escaneamos las filas de muestra para encontrar cuál columna contiene
                    // la mayor concentración de números reales o strings numéricos válidos.
                    const salesCandidates = [vIdx, vIdx - 1, vIdx + 1, vIdx - 2, vIdx + 2, vIdx - 3, vIdx + 3].filter(c => c >= 0);
                    const salesVotes = new Array(salesCandidates.length).fill(0);

                    const prizesCandidates = pIdx !== -1
                        ? [pIdx, pIdx - 1, pIdx + 1, pIdx - 2, pIdx + 2, pIdx - 3, pIdx + 3].filter(c => c >= 0)
                        : [];
                    const prizesVotes = new Array(prizesCandidates.length).fill(0);

                    testRows.forEach((r: any[]) => {
                        if (!r || !Array.isArray(r)) return;
                        const nameSample = String(r[realVendorIdx] ?? '').trim();
                        if (nameSample.length <= 3 || /^nombre$/i.test(nameSample) || /^total/i.test(nameSample)) return;

                        // Votar por Ventas
                        salesCandidates.forEach((col, idx) => {
                            const val = r[col];
                            if (val !== undefined && val !== null && val !== '') {
                                if (typeof val === 'number' && !isNaN(val)) {
                                    salesVotes[idx]++;
                                } else if (typeof val === 'string') {
                                    const cleaned = val.replace(/\s/g, '').replace(/,/g, '.');
                                    if (cleaned !== '' && !isNaN(parseFloat(cleaned))) {
                                        salesVotes[idx]++;
                                    }
                                }
                            }
                        });

                        // Votar por Premios
                        prizesCandidates.forEach((col, idx) => {
                            const val = r[col];
                            if (val !== undefined && val !== null && val !== '') {
                                if (typeof val === 'number' && !isNaN(val)) {
                                    prizesVotes[idx]++;
                                } else if (typeof val === 'string') {
                                    const cleaned = val.replace(/\s/g, '').replace(/,/g, '.');
                                    if (cleaned !== '' && !isNaN(parseFloat(cleaned))) {
                                        prizesVotes[idx]++;
                                    }
                                }
                            }
                        });
                    });

                    // Seleccionar columna ganadora de ventas
                    let maxSalesVotes = 0;
                    let bestSalesIdx = vIdx;
                    salesCandidates.forEach((col, idx) => {
                        if (salesVotes[idx] > maxSalesVotes) {
                            maxSalesVotes = salesVotes[idx];
                            bestSalesIdx = col;
                        }
                    });
                    realSalesIdx = bestSalesIdx;

                    // Seleccionar columna ganadora de premios
                    if (pIdx !== -1) {
                        let maxPrizesVotes = 0;
                        let bestPrizesIdx = pIdx;
                        prizesCandidates.forEach((col, idx) => {
                            if (prizesVotes[idx] > maxPrizesVotes) {
                                maxPrizesVotes = prizesVotes[idx];
                                bestPrizesIdx = col;
                            }
                        });
                        realPrizesIdx = bestPrizesIdx;
                    }

                    salesIdx = realSalesIdx;
                    prizesIdx = realPrizesIdx;
                    vendorIdx = realVendorIdx;
                    headerRowIndex = i;
                    break;
                }
            }

            // Fallback: buscar la primera columna de texto seguida de números
            if (headerRowIndex === -1) {
                for (let i = 0; i < Math.min(data.length, 30); i++) {
                    const row = data[i];
                    if (!row || !Array.isArray(row)) continue;
                    // Buscar primera celda que parezca nombre AMERICANAS (empieza con BS o $)
                    const aIdx = row.findIndex((c: any) => typeof c === 'string' && /^(BS\s*|\$)/i.test(String(c).trim()));
                    if (aIdx !== -1) {
                        vendorIdx = aIdx;
                        // Buscar primer número a la derecha de la columna de nombre
                        for (let j = aIdx + 1; j < row.length; j++) {
                            if (typeof row[j] === 'number') { salesIdx = j; break; }
                        }
                        for (let j = salesIdx + 1; j < row.length; j++) {
                            if (typeof row[j] === 'number') { prizesIdx = j; break; }
                        }
                        headerRowIndex = Math.max(0, i - 1);
                        break;
                    }
                }
            }

            if (vendorIdx !== -1) {
                const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
                data.slice(startRow).forEach((row: any[]) => {
                    const raw = String(row[vendorIdx] ?? '').trim();
                    if (!raw) return;
                    // ── FIX #3: Ignorar headers repetidos internos ────────────────────────
                    // Los Report .xls repiten la fila de encabezado cada ~46 filas.
                    // Detectamos si la celda de venta contiene texto (no número).
                    if (/^totales?/i.test(raw) || raw.toLowerCase() === 'nombre') return;
                    if (salesIdx !== -1) {
                        const salesCell = row[salesIdx];
                        if (typeof salesCell === 'string' && /^[a-z]/i.test(salesCell)) return;
                    }
                    const parsed = parseAmericanasName(raw, forcedCurrency || 'DOLAR');
                    if (!parsed) return;

                    // La moneda se toma de la propia celda (BS/$ del prefijo)
                    const rowCurrency = parsed.currency;

                    let finalName = parsed.vendorName;
                    const rawNameKey = parsed.vendorName.trim().toUpperCase();
                    if (sellerAliases[rawNameKey]) {
                        const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawNameKey]);
                        if (mappedSeller) finalName = mappedSeller.name.toUpperCase();
                    }

                    const salesVal = salesIdx !== -1 ? parseAmount(row[salesIdx]) : 0;
                    const prizesVal = prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0;

                    if (salesVal === 0 && prizesVal === 0) return; // omitir filas vacías

                    rows.push({
                        vendorName: finalName,
                        sales: salesVal,
                        prizes: prizesVal,
                        sourceRow: { ...row, _currency: rowCurrency, _grupo: parsed.grupo, _operadora: parsed.operadora }
                    });
                });
            }

            // Consolidar por vendedor+moneda
            const consolidated = new Map<string, RawRow>();
            for (const row of rows) {
                const key = `${row.vendorName.trim().toUpperCase()}||${row.sourceRow._currency}`;
                const existing = consolidated.get(key);
                if (existing) {
                    existing.sales += row.sales;
                    existing.prizes += row.prizes;
                } else {
                    consolidated.set(key, { ...row });
                }
            }
            const consolidatedRows = Array.from(consolidated.values());

            if (consolidatedRows.length === 0) {
                alert("No se pudo detectar ningun formato en el archivo. Asegurate de que contenga una lista de nombres de agencias con sus montos de venta al lado.");
                return;
            }

            setSession({
                fileName,
                productName,
                currency: forcedCurrency || 'DOLAR',
                date: new Date().toISOString().split('T')[0],
                rows: consolidatedRows,
                detectedType
            });
            setStep('preview');
            return; // Salida anticipada para AMERICANAS
        }
        // ──────────────────────────────────────────────────────────────────────

        // 2. Buscador Universal Dinámico de Columnas
        // Escanea las primeras 30 filas intentando conseguir una fila que tenga columas de Venta, Premio y Nombre/Agencia/Usuario
        let vendorIdx = -1, salesIdx = -1, prizesIdx = -1;
        let headerRowIndex = -1;

        for (let i = 0; i < Math.min(data.length, 30); i++) {
            const row = data[i];
            if (!row || !Array.isArray(row)) continue;
            
            const vIdx = row.findIndex(c => typeof c === 'string' && /venta/i.test(c));
            const pIdx = row.findIndex(c => typeof c === 'string' && /premio|pagado|pago/i.test(c));
            const nIdx = row.findIndex(c => typeof c === 'string' && /nombre|agencia|agentes?|nivel|comercio|taquilla|distribuidor|usuario|vendedor/i.test(c));

            if (vIdx !== -1 && nIdx !== -1) {
                salesIdx = vIdx;
                prizesIdx = pIdx;
                vendorIdx = nIdx;
                headerRowIndex = i;
                break;
            }
        }

        // 3. Fallback Extremo de Inteligencia Artificial
        // Si no encontró ningun encabezado con los nombres conocidos, deduce las columnas por su tipo de dato
        if (headerRowIndex === -1 && data.length > 0) {
            for (let i = 0; i < Math.min(data.length, 30); i++) {
                const row = data[i];
                if (!row || !Array.isArray(row)) continue;
                
                let strIdx = -1;
                let num1Idx = -1;
                let num2Idx = -1;
                
                for(let j=0; j<Math.min(row.length, 25); j++) {
                    const cell = row[j];
                    if (cell === null || cell === undefined || cell === '') continue;
                    
                    const isNum = typeof cell === 'number' || (typeof cell === 'string' && /^-?[\d.,\s]+$/.test(cell) && !isNaN(parseFloat(cell.replace(/[,.\s]/g, ''))));
                    const isStr = typeof cell === 'string' && !isNum && cell.length > 3 && !cell.toUpperCase().includes('TOTAL') && !cell.toUpperCase().includes('FECHA');
                    
                    if (strIdx === -1 && isStr) strIdx = j;
                    else if (strIdx !== -1 && num1Idx === -1 && isNum) num1Idx = j;
                    else if (num1Idx !== -1 && num2Idx === -1 && isNum) num2Idx = j;
                }
                
                if (strIdx !== -1 && num1Idx !== -1) {
                    vendorIdx = strIdx;
                    salesIdx = num1Idx;
                    prizesIdx = num2Idx;
                    headerRowIndex = Math.max(0, i - 1);
                    break;
                }
            }
        }

        if (headerRowIndex !== -1) {
            detectedType = 'unknown'; // Parsed via dynamic engine
            data.slice(headerRowIndex + 1).forEach(row => {
                const name = row[vendorIdx];
                const nameStr = String(name || '').trim().toUpperCase();
                
                // Ignorar filas en blanco, totales, super-rayas "----", y encabezados repetidos
                if (nameStr && !nameStr.includes("TOTAL") && !nameStr.startsWith("-") && nameStr !== "USUARIO" && row[salesIdx] !== undefined) {
                    const rawName = nameStr;
                    let finalName = rawName;
                    
                    if (sellerAliases[rawName]) {
                        const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawName]);
                        if (mappedSeller) finalName = mappedSeller.name.toUpperCase();
                    }
                    
                    rows.push({
                        vendorName: finalName,
                        sales: parseAmount(row[salesIdx]),
                        prizes: prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0,
                        sourceRow: row
                    });
                }
            });
        }

        if (rows.length === 0) {
            alert("No se pudo detectar ningun formato en el archivo. Asegurate de que contenga una lista de nombres de agencias con sus montos de venta al lado.");
            return;
        }

        // Consolidar filas con el mismo vendedor (suma ventas y premios) por si el Excel viene repetido
        const consolidated = new Map<string, RawRow>();
        for (const row of rows) {
            const key = row.vendorName.trim().toUpperCase();
            const existing = consolidated.get(key);
            if (existing) {
                existing.sales += row.sales;
                existing.prizes += row.prizes;
            } else {
                consolidated.set(key, { ...row });
            }
        }
        const consolidatedRows = Array.from(consolidated.values());

        setSession({
            fileName,
            productName,
            currency: 'DOLAR',
            date: new Date().toISOString().split('T')[0],
            rows: consolidatedRows,
            detectedType
        });
        setStep('preview');
    };

    const validateVendors = async () => {
        if (!session) return;
        setLoading(true);

        try {
            const allSales = await api.getSales();
            
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

            const currentSellers = await api.getSellers();
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
                setMissingVendors(uniqueMissing.map(name => ({ 
                    name, 
                    commissionPct: 0, 
                    partPct: 0,
                    isExisting: !!currentSellers.find(s => s.name.trim().toUpperCase() === name.trim().toUpperCase())
                })));
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

    const createAndImportSellers = async () => {
        if (!session || loading) return;
        setLoading(true);
        
        try {
        let updatedSession = { ...session, rows: [...session.rows] };

        const productId = `p-${session.productName.toLowerCase().replace(/\s/g, '-')}`;

        const currentSellers = await api.getSellers();

        for (const v of missingVendors) {
            // Check if mapped to existing
            if (v.mappedSellerId) {
                await addSellerAlias(v.mappedSellerId, v.name);
                
                // We need to update the session.rows immutably so they use the mapped seller's name
                // instead of the raw alias name for the actual import execution.
                const mappedSeller = currentSellers.find(s => Number(s.id) === v.mappedSellerId);
                if (mappedSeller) {
                    updatedSession.rows = updatedSession.rows.map(r => 
                        r.vendorName.trim().toUpperCase() === v.name.trim().toUpperCase()
                            ? { ...r, vendorName: mappedSeller.name.toUpperCase() }
                            : r
                    );

                    // If the mapped seller didn't have the product/currency configured, add it and save
                    let product = mappedSeller.products.find(p => String(p.id) === String(productId) || p.name.toUpperCase() === session.productName.toUpperCase());
                    let needsUpdate = false;
                    
                    if (!product) {
                        product = {
                            id: productId,
                            name: session.productName,
                            currencies: []
                        };
                        mappedSeller.products.push(product);
                        needsUpdate = true;
                    }
                    
                    let currencyConfig = product.currencies.find(c => String(c.id) === String(session.currency) || c.name.toUpperCase() === session.currency.toUpperCase());
                    
                    if (!currencyConfig) {
                        currencyConfig = {
                            id: session.currency,
                            name: session.currency,
                            commissionPct: v.commissionPct || 0,
                            partPct: v.partPct || 0
                        };
                        product.currencies.push(currencyConfig);
                        needsUpdate = true;
                    } else if (currencyConfig.commissionPct === 0 && currencyConfig.partPct === 0 && (v.commissionPct > 0 || v.partPct > 0)) {
                        // Allow override if they were defaulting to 0
                        currencyConfig.commissionPct = v.commissionPct;
                        currencyConfig.partPct = v.partPct;
                        needsUpdate = true;
                    }

                    if (needsUpdate) {
                        await api.updateSeller(mappedSeller);
                    }
                }
                continue;
            }

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
                
                await api.updateSeller(existingSeller);
            } else {
                await api.addSeller({
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
        setSession(updatedSession);
        await executeImport(updatedSession);
        } catch (error: any) {
            console.error(error);
            alert(`Error durante la importación: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    const executeImport = async (validSession?: ImportSession) => {
        const activeSession = validSession || session;
        if (!activeSession) return;
        setLoading(true);

        try {
            if (!(await getGlobalProducts()).includes(activeSession.productName.toUpperCase())) {
                await addGlobalProduct(activeSession.productName);
            }

            const allSellers = await api.getSellers();
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
                await api.updateSeller(seller);

                const comPct = currencyConfig.commissionPct;
                const partPct = currencyConfig.partPct;

                const comision = roundFinance(row.sales * (comPct / 100));
                const neto = roundFinance(row.sales - row.prizes - comision);
                const participacion = roundFinance(neto * (partPct / 100));

                await api.addSale({
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
                                <p className="text-ios-subtext text-xs max-w-xs">Arrastra tu archivo Excel (.xlsx, .xls) o CSV — Betm3, Banklot, Maxplay, Americanas, Report Hipódromo...</p>
                            </div>
                            <label className="mt-4 px-6 py-2.5 bg-ios-blue text-white rounded-full font-bold cursor-pointer hover:brightness-110 active:scale-95 transition-all text-xs shadow-lg shadow-ios-blue/20">
                                Explorar Archivos
                                <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                            </label>
                        </div>
                    )}

                    {step === 'preview' && session && (
                        <div className="animate-fade-in space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                                    <label className="text-[10px] font-bold text-ios-subtext uppercase flex items-center gap-1.5"><Package size={12} /> Producto</label>
                                    <input
                                        list="product-list"
                                        placeholder="Escribe o selecciona..."
                                        value={session.productName}
                                        onChange={(e) => setSession({ ...session, productName: e.target.value.toUpperCase() })}
                                        className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-ios-blue outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
                                    />
                                    <datalist id="product-list">
                                        {products.map(p => <option key={p} value={p} />)}
                                    </datalist>
                                </div>
                                <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                                    <label className="text-[10px] font-bold text-ios-subtext uppercase flex items-center gap-1.5"><Coins size={12} /> Moneda</label>
                                    <input
                                        list="currency-list"
                                        placeholder="Escribe o selecciona..."
                                        value={session.currency}
                                        onChange={(e) => setSession({ ...session, currency: e.target.value.toUpperCase() })}
                                        className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-ios-blue outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
                                    />
                                    <datalist id="currency-list">
                                        {currencies.map(c => <option key={c} value={c} />)}
                                    </datalist>
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
                                                {session.detectedType === 'mastergreen' && (
                                                    <th className="px-5 py-3">Moneda</th>
                                                )}
                                                <th className="px-5 py-3 text-right">Ventas</th>
                                                <th className="px-5 py-3 text-right">Premios</th>
                                                <th className="px-5 py-3 text-right">Importe Neto</th>
                                                <th className="px-5 py-3 text-center">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {session.rows.map((row, i) => (
                                                <tr key={i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                    <td className="px-5 py-2.5 font-bold">{row.vendorName}</td>
                                                    {session.detectedType === 'mastergreen' && (
                                                        <td className="px-5 py-2.5">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                row.sourceRow?._currency === 'BOLIVARES VENEZOLANOS'
                                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                                    : 'bg-ios-blue/10 text-ios-blue'
                                                            }`}>
                                                                {row.sourceRow?._currency === 'BOLIVARES VENEZOLANOS' ? 'Bs' : 'USD'}
                                                            </span>
                                                        </td>
                                                    )}
                                                    <td className="px-5 py-2.5 text-right tabular-nums">{row.sales.toLocaleString()}</td>
                                                    <td className="px-5 py-2.5 text-right tabular-nums text-ios-red">{row.prizes.toLocaleString()}</td>
                                                    <td className="px-5 py-2.5 text-right tabular-nums font-black">{(row.sales - row.prizes).toLocaleString()}</td>
                                                    <td className="px-5 py-2.5 text-center">
                                                        <button 
                                                            onClick={() => handleDeleteRow(i)} 
                                                            className="p-1.5 text-ios-red/70 hover:text-ios-red hover:bg-ios-red/10 rounded-xl transition-colors"
                                                            title="Eliminar fila"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
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
                                {missingVendors.map((v, i) => {
                                    const mappedSeller = v.mappedSellerId ? allSellers.find(s => Number(s.id) === v.mappedSellerId) : null;
                                    const mappedProduct = mappedSeller && session ? mappedSeller.products.find(p => String(p.id) === `p-${session.productName.toLowerCase().replace(/\s/g, '-')}` || p.name.toUpperCase() === session.productName.toUpperCase()) : null;
                                    const mappedCurrency = mappedProduct && session ? mappedProduct.currencies.find(c => String(c.id) === String(session.currency) || c.name.toUpperCase() === session.currency.toUpperCase()) : null;
                                    const needsPercentages = !v.mappedSellerId || !mappedProduct || !mappedCurrency;

                                    return (
                                    <div key={i} className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-ios-red animate-pulse"></div>
                                            <span className="font-bold text-sm truncate flex-1">{v.name}</span>
                                            
                                            {!v.isExisting ? (
                                                <select
                                                    value={v.mappedSellerId || ''}
                                                    onChange={e => {
                                                        const copy = [...missingVendors];
                                                        copy[i].mappedSellerId = e.target.value ? Number(e.target.value) : null;
                                                        setMissingVendors(copy);
                                                    }}
                                                    className="bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-ios-blue outline-none max-w-[200px]"
                                                >
                                                    <option value="">Crear como nuevo (Requiere %)</option>
                                                    {allSellers.map(s => (
                                                        <option key={String(s.id)} value={Number(s.id)}>
                                                            Asignar a {s.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="text-[10px] text-ios-blue font-bold px-3 py-1 bg-ios-blue/10 rounded-full">
                                                    Vendedor existente (Requiere % para Nuevo Producto)
                                                </span>
                                            )}
                                            <button 
                                                onClick={() => handleRemoveMissingVendor(i)}
                                                className="p-1.5 text-ios-red/70 hover:text-ios-red hover:bg-ios-red/10 rounded-xl transition-colors shrink-0"
                                                title="Omitir este vendedor de la importación"
                                                type="button"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        
                                        {needsPercentages && (
                                            <div className="flex items-center gap-4">
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
                                        )}
                                        {v.mappedSellerId && !needsPercentages && (
                                            <div className="text-[10px] text-ios-blue font-bold px-2">
                                                Se usará este vendedor y se guardará la regla de autocompletado para futuras importaciones. Usará sus porcentajes actuales.
                                            </div>
                                        )}
                                        {v.mappedSellerId && needsPercentages && (
                                            <div className="text-[10px] text-ios-blue font-bold px-2">
                                                Este vendedor no tiene los porcentajes para este producto. Por favor configúralos arriba.
                                            </div>
                                        )}
                                    </div>
                                )})}
                            </div>

                            <div className="flex justify-end gap-3 pt-6">
                                <button onClick={reset} className="px-6 py-3 rounded-2xl text-sm font-bold text-ios-subtext hover:bg-black/5">Atrás</button>
                                <button
                                    onClick={createAndImportSellers}
                                    disabled={loading}
                                    className="px-10 py-3 bg-ios-blue text-white rounded-2xl font-bold shadow-lg shadow-ios-blue/20 active:scale-95 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="animate-spin inline mr-2" size={16} /> : null}
                                    {loading ? 'Importando...' : 'Crear y Finalizar Importación'}
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
