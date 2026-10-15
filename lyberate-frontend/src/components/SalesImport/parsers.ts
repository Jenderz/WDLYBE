import { RawRow, ImportSession, ConsolidatedSource } from './types';
import { Seller } from '../../services/apiService';
import {
    normalizeCurrency,
    normalizeProductName,
    normalizeSellerName
} from '../../utils/importNormalize';
import { todayISO } from '../../utils/serverTime';

export const parseAmount = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let s = String(val).trim().replace(/\s/g, '');
    if (!s) return 0;

    // Eliminar símbolos de moneda iniciales ($ / Bs / COP / USD / etc.)
    s = s.replace(/^[$\u20AC\u00A3]|^(BS\.?|COP|USD)/i, '').trim();

    const hasComma = s.includes(',');
    const hasDot = s.includes('.');

    if (hasComma && hasDot) {
        const lastComma = s.lastIndexOf(',');
        const lastDot = s.lastIndexOf('.');
        if (lastDot > lastComma) {
            // Formato estándar anglo: ej. "1,500.00" o "10,085.00" (comas = miles, punto = decimal)
            s = s.replace(/,/g, '');
        } else {
            // Formato hispano: ej. "6.935,00" o "1.500,50" (puntos = miles, coma = decimal)
            s = s.replace(/\./g, '').replace(',', '.');
        }
    } else if (hasComma) {
        const parts = s.split(',');
        if (parts.length > 2) {
            // Múltiples comas: ej. "1,000,000" -> separador de miles
            s = s.replace(/,/g, '');
        } else if (parts[1] && parts[1].length === 3 && parts[0] && parts[0].length <= 3) {
            // Una sola coma seguida de 3 dígitos (ej: "1,500" o "15,360") -> miles
            s = s.replace(',', '');
        } else {
            // Decimal (ej: "125,50" o "0,75")
            s = s.replace(',', '.');
        }
    } else if (hasDot) {
        const parts = s.split('.');
        if (parts.length > 2) {
            // Múltiples puntos: ej. "1.000.000" -> separador de miles
            s = s.replace(/\./g, '');
        }
    }

    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
};

/**
 * Detección robusta de la moneda por el nombre del archivo usando la normalización canónica.
 */
export const detectFileCurrency = (fn: string, contentSample: string = ''): string => {
    return normalizeCurrency(fn + ' ' + contentSample);
};

/**
 * Extrae fechas contenidas directamente en las celdas de un archivo (ej: "FECHA: 25/3/2026 - 25/3/2026").
 */
export const extractDateFromCells = (data: any[][]): string | null => {
    for (let i = 0; i < Math.min(data.length, 10); i++) {
        const row = data[i];
        if (!row || !Array.isArray(row)) continue;
        for (const cell of row) {
            if (!cell) continue;
            const str = String(cell).trim();
            // Buscar formato DD/MM/YYYY o D/M/YYYY
            const match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (match) {
                const [, d, m, y] = match;
                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
            // Buscar formato ISO YYYY-MM-DD
            const matchIso = str.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
            if (matchIso) {
                const [, y, m, d] = matchIso;
                return `${y}-${m}-${d}`;
            }
        }
    }
    return null;
};

/**
 * Extrae la fecha inicial de una semana contable a partir del nombre del archivo.
 * Soporta rangos tipo DDMMYYYY-DDMMYYYY (ej. MM20828092026-04102026 -> 2026-09-28)
 * y fechas directas YYYY-MM-DD o DD-MM-YYYY.
 */
export const extractDateFromFilename = (fileName: string): string | null => {
    if (!fileName) return null;
    const matchRange = fileName.match(/(\d{2})(\d{2})(\d{4})\s*-\s*(\d{2})(\d{2})(\d{4})/);
    if (matchRange) {
        const [, d, m, y] = matchRange;
        return `${y}-${m}-${d}`;
    }
    const matchIso = fileName.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
    if (matchIso) {
        const [, y, m, d] = matchIso;
        return `${y}-${m}-${d}`;
    }
    const matchCommon = fileName.match(/(\d{2})[-_](\d{2})[-_](\d{4})/);
    if (matchCommon) {
        const [, d, m, y] = matchCommon;
        return `${y}-${m}-${d}`;
    }
    return null;
};

/**
 * Parser para el formato AMERICANAS / Reportes de Centros Hípicos.
 */
export const parseAmericanasName = (
    raw: string,
    defaultCurrency: string = 'DOLAR'
): { currency: string; agencyName: string; grupo: string; operadora: string; isGrande: boolean } | null => {
    if (!raw) return null;
    let s = String(raw).trim();
    if (!s) return null;

    let currency = defaultCurrency;
    let rest = s;

    // 1. Detectar prefijo de moneda
    if (/^BS\s*/i.test(s)) {
        currency = 'BOLIVARES VENEZOLANOS';
        rest = s.replace(/^BS\s*/i, '');
    } else if (/^\$\s*/.test(s)) {
        currency = 'DOLAR';
        rest = s.replace(/^\$\s*/, '');
    }

    // 2. Extraer paréntesis (operadoras / oficinas vs grupos entre paréntesis)
    let operadora = '';
    let potentialParenGroup = '';
    const parenParts: string[] = [];
    const parenGlobal = /\(([^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = parenGlobal.exec(rest)) !== null) {
        parenParts.push(m[1].trim().toUpperCase());
    }
    parenParts.forEach(p => {
        if (/^(OFIC|W DEPORTES|WORLD DEPORTES|GBC|GBC GAMING|STREAM)/i.test(p)) {
            operadora = operadora ? `${operadora} / ${p}` : p;
        } else {
            potentialParenGroup = p;
        }
    });
    rest = rest.replace(/\s*\([^)]*\)/g, '').trim();

    // 3. Separar por el PRIMER guión encontrado (ej. "Andres - Grupo")
    const firstDashIndex = rest.indexOf('-');
    let agencyName = '';
    let grupo = '';

    if (firstDashIndex !== -1) {
        agencyName = rest.substring(0, firstDashIndex).trim();
        grupo = rest.substring(firstDashIndex + 1).trim();
    } else if (potentialParenGroup) {
        agencyName = rest.trim();
        grupo = potentialParenGroup;
    } else if (/\.\s*[A-Z]/.test(rest)) {
        const dotIdx = rest.lastIndexOf('.');
        agencyName = rest.substring(0, dotIdx).trim();
        grupo = rest.substring(dotIdx + 1).trim();
    } else {
        agencyName = rest.trim();
        grupo = rest.trim();
    }

    // Limpieza de caracteres residuales en agencyName
    agencyName = agencyName.replace(/^[/\s.\-]+/, '').replace(/[\s.\-]+$/, '').trim();
    if (/\s+BS$/i.test(agencyName)) {
        currency = 'BOLIVARES VENEZOLANOS';
        agencyName = agencyName.replace(/\s+BS$/i, '').trim();
    } else if (/\s+\$$/i.test(agencyName)) {
        currency = 'DOLAR';
        agencyName = agencyName.replace(/\s+\$$/i, '').trim();
    }

    // Limpieza de caracteres residuales en grupo
    grupo = grupo.replace(/^[\s.\-]+/, '').replace(/[\s.\-]+$/, '').trim().toUpperCase();

    if (!grupo) {
        grupo = agencyName.toUpperCase();
    }

    if (!agencyName && !grupo) return null;

    const isGrande = grupo.includes('GRANDE') || agencyName.toUpperCase().includes('GRANDE');

    return {
        currency,
        agencyName,
        grupo,
        operadora,
        isGrande
    };
};

/**
 * Parser para nombres de agentes en formato Mastergreen / Worlddeportes / Adminwd / Parley.
 */
export const parseMastergreenName = (
    raw: string,
    defaultCurrency: string = 'DOLAR'
): { currency: string; vendorName: string } | null => {
    const s = raw.trim();
    if (/^parley\s+/i.test(s)) return null;

    const match = s.match(/^(.+?)\s+(Usd|USD|usd|Bs|BS|bs|Cop|COP|cop)$/i);
    if (match) {
        const name = normalizeSellerName(match[1]);
        const currency = normalizeCurrency(match[2]);
        if (!name) return null;
        return { vendorName: name, currency };
    }

    const name = normalizeSellerName(s);
    if (!name) return null;
    return { vendorName: name, currency: defaultCurrency };
};

export interface ParseAnalysisResult {
    session: ImportSession | null;
    needsManualMapping: boolean;
    headerRowIndex: number;
}

/**
 * Analiza un conjunto de datos (tabla JSON de un archivo Excel o CSV) y genera una ImportSession estructurada.
 */
export const analyzeImportData = (
    fileName: string,
    data: any[][],
    sellerAliases: Record<string, number>,
    allSellers: Seller[]
): ParseAnalysisResult => {
    let detectedType: ImportSession['detectedType'] = 'unknown';
    let rows: RawRow[] = [];
    let productName = "";
    let forcedCurrency: string | null = null;

    const fileNameUpper = fileName.toUpperCase();
    const contentStr = JSON.stringify(data.slice(0, 15)).toUpperCase();

    // Detección de firma de reporte de Gato / Gato Negro (por Agencia o Distribuidor)
    const firstRowStr = JSON.stringify(data[0] || []).toUpperCase();
    const isGatoSignature = (
        (firstRowStr.includes('POR') || firstRowStr.includes('REPORTE')) &&
        (firstRowStr.includes('AGENCIA') || firstRowStr.includes('DISTRIBUIDOR'))
    ) || (
        contentStr.includes('DISTRIBUIDOR') && contentStr.includes('VENTAS') && contentStr.includes('SALDO')
    ) || (
        fileNameUpper.includes('DISTRIBUIDOR')
    );

    // 0. Detectar el nombre del producto sugerido basado en nombre de archivo y contenido
    const combinedStr = fileNameUpper + ' ' + contentStr;
    if (combinedStr.includes("MAXPLAY") || String(data[0]?.[0] || '').toUpperCase().includes("MAXPLAY")) productName = "ANIMALITOS MAX PLAY";
    else if (isGatoSignature || combinedStr.includes("GATO")) productName = "GATO NEGRO";
    else if (combinedStr.includes("ANIMALITO")) productName = "ANIMALITOS";
    else if (combinedStr.includes("BETM3")) productName = "PARLEY BETM3";
    else if (fileNameUpper.includes("LOTOREY") || fileNameUpper.includes("LOTERIAS") || fileNameUpper.includes("BANKLOT") || contentStr.includes("BANKLOT") || contentStr.includes("LOTOREY")) productName = "LOTERIAS";
    else if (combinedStr.includes("GALILEO")) productName = "GALILEO";
    else if (combinedStr.includes("POSNET")) productName = "POSNET";
    else if (fileNameUpper.includes("ADMINWD") || combinedStr.includes("INH") || combinedStr.includes("HIPICO")) productName = "PARLEY INH";
    else if (combinedStr.includes("INMEJORABLE") || combinedStr.includes("PARLEY")) productName = "PARLEY";
    else if (combinedStr.includes("NACIONALES")) productName = "NACIONALES";
    else if (combinedStr.includes("AMERICANAS")) productName = "AMERICANAS";

    // ─── Detección formato BETM3 (www.betm3.com / Animalitos / Consolidado / Loterias) ──
    const firstCell = String(data[0]?.[0] || '');
    const isBetm3 = firstCell.toLowerCase().includes('betm3.com') ||
        fileNameUpper.includes('BETM3') ||
        contentStr.includes('BETM3.COM') ||
        (firstCell.toLowerCase().includes('reporte general de ventas') && contentStr.includes('BETM3'));

    if (isBetm3) {
        detectedType = 'betm3';
        const lines = firstCell.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
        let betm3Product = 'PARLEY BETM3';
        let betm3Currency = 'BOLIVARES VENEZOLANOS';
        let betm3Date = '';

        for (const line of lines) {
            const lineUpper = line.toUpperCase();
            if (lineUpper.includes('ANIMALITO')) {
                betm3Product = 'ANIMALITOS';
            } else if (lineUpper.includes('LOTERIA')) {
                betm3Product = 'LOTERIAS';
            } else if (lineUpper.includes('CONSOLIDADO') || lineUpper.includes('PARLEY')) {
                betm3Product = 'PARLEY BETM3';
            } else if (lineUpper.includes('AMERICAN')) {
                betm3Product = 'AMERICANAS';
            }

            if (lineUpper.includes('BOLIVAR') || lineUpper.includes('VES') || lineUpper.includes('BS')) {
                betm3Currency = 'BOLIVARES VENEZOLANOS';
            } else if (lineUpper.includes('DOLAR') || lineUpper.includes('USD')) {
                betm3Currency = 'DOLAR';
            } else if (lineUpper.includes('PESO') || lineUpper.includes('COP')) {
                betm3Currency = 'PESO COLOMBIANA';
            }

            const dateMatch = line.match(/(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2})\/(\d{2})\/(\d{4})/);
            if (dateMatch) {
                betm3Date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
            }
        }

        let taqIdx = -1, salesIdx = -1, anuladosIdx = -1, prizesIdx = -1;
        let headerRowIndex = -1;

        for (let i = 0; i < Math.min(data.length, 10); i++) {
            const row = data[i];
            if (!row || !Array.isArray(row)) continue;
            const tIdx = row.findIndex((c: any) =>
                typeof c === 'string' &&
                /^(nombre|taquillas?|agentes?|usuario|concesionario|vendedor)$/i.test(String(c).trim())
            );
            if (tIdx !== -1) {
                taqIdx = tIdx;
                headerRowIndex = i;
                const vIdx = row.findIndex((c: any, j: number) => j > tIdx && typeof c === 'string' && /venta/i.test(c));
                salesIdx = vIdx !== -1 ? vIdx : taqIdx + 1;
                const anIdx = row.findIndex((c: any, j: number) => j > tIdx && typeof c === 'string' && /anulad/i.test(c));
                anuladosIdx = anIdx !== -1 ? anIdx : -1;
                const pIdx = row.findIndex((c: any, j: number) => j > taqIdx && typeof c === 'string' && /premio/i.test(c));
                prizesIdx = pIdx !== -1 ? pIdx : -1;
                break;
            }
        }

        if (taqIdx !== -1 && salesIdx !== -1) {
            const betm3Rows: RawRow[] = [];
            data.slice(headerRowIndex + 1).forEach((row: any[]) => {
                const rawName = String(row[taqIdx] ?? '').trim().toUpperCase();
                if (!rawName || /^total/i.test(rawName) || rawName === 'NOMBRE') return;

                let finalName = rawName;
                let isAliased = false;
                if (sellerAliases[rawName]) {
                    const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawName]);
                    if (mappedSeller) {
                        finalName = mappedSeller.name.toUpperCase();
                        isAliased = true;
                    }
                }

                const rawSalesVal = salesIdx !== -1 ? parseAmount(row[salesIdx]) : 0;
                const anuladosVal = anuladosIdx !== -1 ? parseAmount(row[anuladosIdx]) : 0;
                const salesVal = rawSalesVal;
                const prizesVal = prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0;
                if (salesVal === 0 && prizesVal === 0) return;

                const sourceItem: ConsolidatedSource = {
                    originalName: rawName,
                    sales: salesVal,
                    prizes: prizesVal,
                    isAliased
                };

                betm3Rows.push({
                    vendorName: finalName,
                    originalName: rawName,
                    isAliased,
                    sources: [sourceItem],
                    productName: betm3Product,
                    sales: salesVal,
                    prizes: prizesVal,
                    sourceRow: { ...row, _currency: betm3Currency, _productName: betm3Product, _anulados: anuladosVal }
                });
            });

            if (betm3Rows.length > 0) {
                const consolidated = new Map<string, RawRow>();
                for (const row of betm3Rows) {
                    const key = `${row.vendorName.trim().toUpperCase()}||${betm3Product}||${betm3Currency}`;
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

                return {
                    session: {
                        fileName,
                        productName: betm3Product,
                        currency: betm3Currency,
                        date: betm3Date || todayISO(),
                        rows: Array.from(consolidated.values()),
                        detectedType: 'betm3'
                    },
                    needsManualMapping: false,
                    headerRowIndex
                };
            }
        }
    }

    // ─── Detección formato MASTERGREEN / WORLDDEPORTES / ADMINWD / PARLEY ─
    const isParley = fileNameUpper.includes('PARLEY') || (contentStr.includes('PARLEY') && contentStr.includes('AGENTES'));
    const isMastergreen = fileNameUpper.includes('MASTERGREEN')
        || fileNameUpper.includes('WORLDDEPORTES')
        || fileNameUpper.includes('ADMINWD')
        || isParley;

    if (isMastergreen) {
        if (fileNameUpper.includes('ADMINWD') || fileNameUpper.includes('INH') || fileNameUpper.includes('HIPICO')) {
            detectedType = 'adminwd';
            productName = 'PARLEY INH';
        } else if (isParley) {
            detectedType = 'parley';
            if (!productName || productName === 'WORLDDEPORTES') productName = 'PARLEY';
        } else if (fileNameUpper.includes('WORLDDEPORTES') || fileNameUpper.includes('WORLD DEPORTES')) {
            detectedType = 'mastergreen';
            productName = 'WORLDDEPORTES';
        } else {
            detectedType = 'mastergreen';
            if (!productName) productName = 'WORLDDEPORTES';
        }

        let taqIdx = -1, salesIdx = -1, anuladosIdx = -1, prizesIdx = -1;
        let headerRowIndex = -1;

        for (let i = 0; i < Math.min(data.length, 10); i++) {
            const row = data[i];
            if (!row || !Array.isArray(row)) continue;
            const tIdx = row.findIndex((c: any) =>
                typeof c === 'string' &&
                /^(taquillas?|agentes?|g\.\s*recogedores?|recogedores?)$/i.test(String(c).trim())
            );
            if (tIdx !== -1) {
                taqIdx = tIdx;
                headerRowIndex = i;
                const vIdx = row.findIndex((c: any, j: number) => j > tIdx && typeof c === 'string' && /venta/i.test(c));
                salesIdx = vIdx !== -1 ? vIdx : taqIdx + 1;
                const anIdx = row.findIndex((c: any, j: number) => j > tIdx && typeof c === 'string' && /anulad/i.test(c));
                anuladosIdx = anIdx !== -1 ? anIdx : -1;
                const pIdx = row.findIndex((c: any, j: number) => j > taqIdx && typeof c === 'string' && /premio/i.test(c));
                prizesIdx = pIdx !== -1 ? pIdx : -1;
                break;
            }
        }

        if (taqIdx !== -1) {
            const hasParleyBreakdown = isParley && data.slice(headerRowIndex + 1).some(r => {
                const raw = String(r?.[taqIdx] ?? '').trim();
                return /^parley\s+([^\s]+)\s+(usd|bs|cop)\s+/i.test(raw);
            });

            const consolidatedMG = new Map<string, RawRow>();

            data.slice(headerRowIndex + 1).forEach((row: any[]) => {
                const raw = String(row[taqIdx] ?? '').trim();
                if (!raw || /^total/i.test(raw)) return;

                if (hasParleyBreakdown) {
                    const match = raw.match(/^parley\s+([^\s]+)\s+(usd|bs|cop)\s+(.+)$/i);
                    if (!match) return;

                    const subProduct = normalizeProductName('PARLEY ' + match[1]);
                    const currency = normalizeCurrency(match[2]);

                    const originalRawVendor = normalizeSellerName(match[3]);
                    let vendorName = originalRawVendor;
                    const rawKey = vendorName;
                    let isAliased = false;
                    if (sellerAliases[rawKey]) {
                        const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawKey]);
                        if (mappedSeller) {
                            vendorName = normalizeSellerName(mappedSeller.name);
                            isAliased = true;
                        }
                    }

                    const rawSalesVal = salesIdx !== -1 ? parseAmount(row[salesIdx]) : 0;
                    const anuladosVal = anuladosIdx !== -1 ? parseAmount(row[anuladosIdx]) : 0;
                    const salesVal  = rawSalesVal;
                    const prizesVal = prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0;
                    if (salesVal === 0 && prizesVal === 0) return;

                    const sourceItem: ConsolidatedSource = {
                        originalName: originalRawVendor,
                        sales: salesVal,
                        prizes: prizesVal,
                        isAliased
                    };

                    const key = `${vendorName}||${subProduct}||${currency}`;
                    const existing = consolidatedMG.get(key);
                    if (existing) {
                        existing.sales  += salesVal;
                        existing.prizes += prizesVal;
                        if (!existing.sources) existing.sources = [];
                        existing.sources.push(sourceItem);
                        if (isAliased) existing.isAliased = true;
                    } else {
                        consolidatedMG.set(key, {
                            vendorName,
                            originalName: originalRawVendor,
                            isAliased,
                            sources: [sourceItem],
                            productName: subProduct,
                            sales:  salesVal,
                            prizes: prizesVal,
                            sourceRow: { ...row, _currency: currency, _productName: subProduct, _anulados: anuladosVal }
                        });
                    }
                } else {
                    if (/^parley\s+/i.test(raw)) return;

                    const parsed = parseMastergreenName(raw);
                    if (!parsed) return;

                    const { vendorName, currency } = parsed;
                    let finalName = vendorName;
                    const rawKey = vendorName.trim().toUpperCase();
                    let isAliased = false;
                    if (sellerAliases[rawKey]) {
                        const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawKey]);
                        if (mappedSeller) {
                            finalName = mappedSeller.name.toUpperCase();
                            isAliased = true;
                        }
                    }

                    const rawSalesVal = salesIdx !== -1 ? parseAmount(row[salesIdx]) : 0;
                    const anuladosVal = anuladosIdx !== -1 ? parseAmount(row[anuladosIdx]) : 0;
                    const salesVal  = rawSalesVal;
                    const prizesVal = prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0;
                    if (salesVal === 0 && prizesVal === 0) return;

                    const sourceItem: ConsolidatedSource = {
                        originalName: vendorName,
                        sales: salesVal,
                        prizes: prizesVal,
                        isAliased
                    };

                    const effectiveProduct = productName || (detectedType === 'adminwd' ? 'PARLEY INH' : 'WORLDDEPORTES');
                    const key = `${finalName}||${effectiveProduct}||${currency}`;
                    const existing = consolidatedMG.get(key);
                    if (existing) {
                        existing.sales  += salesVal;
                        existing.prizes += prizesVal;
                        if (!existing.sources) existing.sources = [];
                        existing.sources.push(sourceItem);
                        if (isAliased) existing.isAliased = true;
                    } else {
                        consolidatedMG.set(key, {
                            vendorName: finalName,
                            originalName: vendorName,
                            isAliased,
                            sources: [sourceItem],
                            productName: effectiveProduct,
                            sales:  salesVal,
                            prizes: prizesVal,
                            sourceRow: { ...row, _currency: currency, _anulados: anuladosVal, _productName: effectiveProduct }
                        });
                    }
                }
            });

            const mgRows = Array.from(consolidatedMG.values());
            if (mgRows.length > 0) {
                const hasBs  = mgRows.some(r => normalizeCurrency(r.sourceRow._currency) === 'BOLIVARES VENEZOLANOS');
                const hasUsd = mgRows.some(r => normalizeCurrency(r.sourceRow._currency) === 'DOLAR');
                const hasCop = mgRows.some(r => normalizeCurrency(r.sourceRow._currency) === 'PESO COLOMBIANA');
                const sessionCurrency = (hasBs && !hasUsd && !hasCop) ? 'BOLIVARES VENEZOLANOS'
                    : (hasCop && !hasUsd && !hasBs) ? 'PESO COLOMBIANA'
                    : 'DOLAR';

                const fileDate = extractDateFromFilename(fileName);
                const finalSessionProduct = productName || (detectedType === 'adminwd' ? 'PARLEY INH' : 'WORLDDEPORTES');

                return {
                    session: {
                        fileName,
                        productName: finalSessionProduct,
                        currency: sessionCurrency,
                        date: fileDate || todayISO(),
                        rows: mgRows,
                        detectedType
                    },
                    needsManualMapping: false,
                    headerRowIndex
                };
            }
        }
    }

    // ─── Detección formato AMERICANAS / Report Hipódromo ──────────────────
    const isKnownOtherProduct = !!productName && !['AMERICANAS'].includes(productName);
    const isReportFile = /^REPORT[\s\-_].*\.xls/i.test(fileName) || fileNameUpper === 'REPORT.XLS';
    const isAmericanas = !isKnownOtherProduct && (
        fileNameUpper.includes('AMERICANAS') ||
        fileNameUpper.includes('HIPIC') ||
        contentStr.includes('CENTROS HIPICOS') ||
        contentStr.includes('HIPICO') ||
        contentStr.includes('WCENTER') ||
        isReportFile
    );

    if (isAmericanas) {
        detectedType = 'americanas';
        if (!productName) productName = 'AMERICANAS';
        forcedCurrency = detectFileCurrency(fileName);

        let vendorIdx = -1, salesIdx = -1, prizesIdx = -1;
        let headerRowIndex = -1;

        for (let i = 0; i < Math.min(data.length, 30); i++) {
            const row = data[i];
            if (!row || !Array.isArray(row)) continue;
            const vIdx = row.findIndex((c: any) => typeof c === 'string' && /venta/i.test(c));
            const pIdx = row.findIndex((c: any) => typeof c === 'string' && /premio|pagado|pago/i.test(c));
            const nIdx = row.findIndex((c: any) => typeof c === 'string' && /nombre/i.test(c));
            if (vIdx !== -1 && nIdx !== -1) {
                let realSalesIdx = vIdx;
                let realPrizesIdx = pIdx;
                let realVendorIdx = nIdx;
                const testRows = data.slice(i + 1, i + 100);

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

                let maxSalesVotes = 0;
                let bestSalesIdx = vIdx;
                salesCandidates.forEach((col, idx) => {
                    if (salesVotes[idx] > maxSalesVotes) {
                        maxSalesVotes = salesVotes[idx];
                        bestSalesIdx = col;
                    }
                });
                realSalesIdx = bestSalesIdx;

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

        if (headerRowIndex === -1) {
            for (let i = 0; i < Math.min(data.length, 30); i++) {
                const row = data[i];
                if (!row || !Array.isArray(row)) continue;
                const aIdx = row.findIndex((c: any) => typeof c === 'string' && /^(BS\s*|\$)/i.test(String(c).trim()));
                if (aIdx !== -1) {
                    vendorIdx = aIdx;
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
                if (/^totales?/i.test(raw) || raw.toLowerCase() === 'nombre') return;
                if (salesIdx !== -1) {
                    const salesCell = row[salesIdx];
                    if (typeof salesCell === 'string' && /^[a-z]/i.test(salesCell)) return;
                }
                const parsed = parseAmericanasName(raw, forcedCurrency || 'DOLAR');
                if (!parsed) return;

                const rowCurrency = parsed.currency;
                const isGrande = parsed.isGrande;
                let finalVendorName = isGrande ? parsed.agencyName : parsed.grupo;
                const originalOrigin = finalVendorName;
                const rawVendorKey = finalVendorName.trim().toUpperCase();
                let isAliased = false;
                if (sellerAliases[rawVendorKey]) {
                    const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawVendorKey]);
                    if (mappedSeller) {
                        finalVendorName = mappedSeller.name.toUpperCase();
                        isAliased = true;
                    }
                }

                const salesVal = salesIdx !== -1 ? parseAmount(row[salesIdx]) : 0;
                const prizesVal = prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0;
                if (salesVal === 0 && prizesVal === 0) return;

                const sourceItem: ConsolidatedSource = {
                    originalName: originalOrigin,
                    agencyName: parsed.agencyName,
                    sales: salesVal,
                    prizes: prizesVal,
                    isAliased
                };

                rows.push({
                    vendorName: finalVendorName,
                    originalName: originalOrigin,
                    agencyName: parsed.agencyName,
                    isAliased,
                    sources: [sourceItem],
                    sales: salesVal,
                    prizes: prizesVal,
                    sourceRow: {
                        ...row,
                        _currency: rowCurrency,
                        _grupo: isGrande ? finalVendorName : parsed.grupo,
                        _agencyName: parsed.agencyName,
                        _operadora: parsed.operadora,
                        _isIndividual: isGrande
                    }
                });
            });

            const consolidated = new Map<string, RawRow>();
            for (const row of rows) {
                const key = `${row.vendorName.trim().toUpperCase()}||${(row.agencyName || '').trim().toUpperCase()}||${row.sourceRow._currency}`;
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
            const consolidatedRows = Array.from(consolidated.values());

            if (consolidatedRows.length > 0) {
                return {
                    session: {
                        fileName,
                        productName,
                        currency: forcedCurrency || 'DOLAR',
                        date: todayISO(),
                        rows: consolidatedRows,
                        detectedType
                    },
                    needsManualMapping: false,
                    headerRowIndex
                };
            }
        }
    }

    // ─── 2. Detección formato MAXPLAY (ANIMALITOS MAXPLAY) ──────────────────
    const isMaxplay = fileNameUpper.includes('MAXPLAY') ||
        contentStr.includes('MAXPLAY') ||
        String(data[0]?.[0] || '').toUpperCase().includes('MAXPLAY');

    if (isMaxplay) {
        detectedType = 'maxplay';
        const maxplayProduct = 'ANIMALITOS MAX PLAY';
        const maxplayCurrency = detectFileCurrency(fileName, contentStr) || 'BOLIVARES VENEZOLANOS';
        const fileDate = extractDateFromCells(data) || extractDateFromFilename(fileName) || todayISO();

        let taqIdx = -1, salesIdx = -1, prizesIdx = -1, commIdx = -1, partIdx = -1;
        let headerRowIndex = -1;

        for (let i = 0; i < Math.min(data.length, 10); i++) {
            const row = data[i];
            if (!row || !Array.isArray(row)) continue;
            const tIdx = row.findIndex(c => typeof c === 'string' && /^(taquillas?|agencias?|agentes?|vendedor)$/i.test(String(c).trim()));
            const sIdx = row.findIndex(c => typeof c === 'string' && /^ventas?$/i.test(String(c).trim()));
            if (tIdx !== -1 && sIdx !== -1) {
                taqIdx = tIdx;
                salesIdx = sIdx;
                headerRowIndex = i;
                prizesIdx = row.findIndex(c => typeof c === 'string' && /^premios?$/i.test(String(c).trim()));
                commIdx = row.findIndex(c => typeof c === 'string' && /^(porcentaje|comisi[oó]n)$/i.test(String(c).trim()));
                partIdx = row.findIndex(c => typeof c === 'string' && /^participa/i.test(String(c).trim()));
                break;
            }
        }

        if (taqIdx !== -1 && salesIdx !== -1) {
            const maxplayRows: RawRow[] = [];
            data.slice(headerRowIndex + 1).forEach((row: any[]) => {
                const rawName = String(row[taqIdx] ?? '').trim().toUpperCase();
                if (!rawName || /^total/i.test(rawName) || rawName === 'TAQUILLAS' || rawName === 'TAQUILLA') return;

                const salesVal = parseAmount(row[salesIdx]);
                const prizesVal = prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0;
                const importedComm = commIdx !== -1 ? parseAmount(row[commIdx]) : 0;
                const importedPart = partIdx !== -1 ? parseAmount(row[partIdx]) : 0;
                if (salesVal === 0 && prizesVal === 0) return;

                let finalVendorName = rawName;
                let isAliased = false;
                if (sellerAliases[rawName]) {
                    const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawName]);
                    if (mappedSeller) {
                        finalVendorName = mappedSeller.name.toUpperCase();
                        isAliased = true;
                    }
                }

                const sourceItem: ConsolidatedSource = {
                    originalName: rawName,
                    agencyName: rawName,
                    sales: salesVal,
                    prizes: prizesVal,
                    isAliased
                };

                maxplayRows.push({
                    vendorName: finalVendorName,
                    originalName: rawName,
                    agencyName: rawName,
                    isAliased,
                    sources: [sourceItem],
                    productName: maxplayProduct,
                    sales: salesVal,
                    prizes: prizesVal,
                    sourceRow: {
                        ...row,
                        _currency: maxplayCurrency,
                        _productName: maxplayProduct,
                        _importedCommission: importedComm,
                        _importedParticipation: importedPart,
                        _agencyName: rawName
                    }
                });
            });

            if (maxplayRows.length > 0) {
                const consolidated = new Map<string, RawRow>();
                for (const r of maxplayRows) {
                    const key = `${r.vendorName.trim().toUpperCase()}||${(r.agencyName || '').trim().toUpperCase()}||${maxplayCurrency}`;
                    const existing = consolidated.get(key);
                    if (existing) {
                        existing.sales += r.sales;
                        existing.prizes += r.prizes;
                        if (r.sources && r.sources.length > 0) {
                            existing.sources = [...(existing.sources || []), ...r.sources];
                        }
                        if (r.isAliased) existing.isAliased = true;
                    } else {
                        consolidated.set(key, { ...r, sources: r.sources ? [...r.sources] : [] });
                    }
                }

                return {
                    session: {
                        fileName,
                        productName: maxplayProduct,
                        currency: maxplayCurrency,
                        date: fileDate,
                        rows: Array.from(consolidated.values()),
                        detectedType: 'maxplay'
                    },
                    needsManualMapping: false,
                    headerRowIndex
                };
            }
        }
    }

    // ─── 3. Detección formato GATO / GATO NEGRO (Agencia y Distribuidor) ─────
    if (isGatoSignature || fileNameUpper.includes('GATO') || contentStr.includes('GATO')) {
        detectedType = 'gato';
        const gatoProduct = 'GATO NEGRO';
        const gatoCurrency = detectFileCurrency(fileName, contentStr) || 'BOLIVARES VENEZOLANOS';
        const fileDate = extractDateFromCells(data) || extractDateFromFilename(fileName) || todayISO();

        const isByAgencia = firstRowStr.includes('AGENCIA') || contentStr.includes('"AGENCIA"');

        let vendorIdx = -1, salesIdx = -1, prizesIdx = -1, commIdx = -1;
        let headerRowIndex = -1;

        for (let i = 0; i < Math.min(data.length, 10); i++) {
            const row = data[i];
            if (!row || !Array.isArray(row)) continue;
            const vCol = row.findIndex(c => typeof c === 'string' && /^(agencias?|distribuidors?|taquillas?|vendedor)$/i.test(String(c).trim()));
            const sCol = row.findIndex(c => typeof c === 'string' && /^ventas?$/i.test(String(c).trim()));
            if (vCol !== -1 && sCol !== -1) {
                vendorIdx = vCol;
                salesIdx = sCol;
                headerRowIndex = i;
                prizesIdx = row.findIndex(c => typeof c === 'string' && /^premios?$/i.test(String(c).trim()));
                commIdx = row.findIndex(c => typeof c === 'string' && /comisi[oó]n/i.test(String(c).trim()));
                break;
            }
        }

        if (vendorIdx !== -1 && salesIdx !== -1) {
            const gatoRows: RawRow[] = [];
            data.slice(headerRowIndex + 1).forEach((row: any[]) => {
                const rawName = String(row[vendorIdx] ?? '').trim().toUpperCase();
                if (!rawName || /^total/i.test(rawName) || rawName === 'AGENCIA' || rawName === 'DISTRIBUIDOR') return;

                const salesVal = parseAmount(row[salesIdx]);
                const prizesVal = prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0;
                const importedComm = commIdx !== -1 ? parseAmount(row[commIdx]) : 0;
                if (salesVal === 0 && prizesVal === 0) return;

                let finalVendorName = rawName;
                let agencyName = isByAgencia ? rawName : undefined;
                let isAliased = false;

                if (sellerAliases[rawName]) {
                    const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawName]);
                    if (mappedSeller) {
                        finalVendorName = mappedSeller.name.toUpperCase();
                        isAliased = true;
                    }
                }

                const sourceItem: ConsolidatedSource = {
                    originalName: rawName,
                    agencyName: agencyName,
                    sales: salesVal,
                    prizes: prizesVal,
                    isAliased
                };

                gatoRows.push({
                    vendorName: finalVendorName,
                    originalName: rawName,
                    agencyName: agencyName,
                    isAliased,
                    sources: [sourceItem],
                    productName: gatoProduct,
                    sales: salesVal,
                    prizes: prizesVal,
                    sourceRow: {
                        ...row,
                        _currency: gatoCurrency,
                        _productName: gatoProduct,
                        _agencyName: agencyName,
                        _importedCommission: importedComm
                    }
                });
            });

            if (gatoRows.length > 0) {
                const consolidated = new Map<string, RawRow>();
                for (const r of gatoRows) {
                    const key = `${r.vendorName.trim().toUpperCase()}||${(r.agencyName || '').trim().toUpperCase()}||${gatoCurrency}`;
                    const existing = consolidated.get(key);
                    if (existing) {
                        existing.sales += r.sales;
                        existing.prizes += r.prizes;
                        if (r.sources && r.sources.length > 0) {
                            existing.sources = [...(existing.sources || []), ...r.sources];
                        }
                        if (r.isAliased) existing.isAliased = true;
                    } else {
                        consolidated.set(key, { ...r, sources: r.sources ? [...r.sources] : [] });
                    }
                }

                return {
                    session: {
                        fileName,
                        productName: gatoProduct,
                        currency: gatoCurrency,
                        date: fileDate,
                        rows: Array.from(consolidated.values()),
                        detectedType: 'gato'
                    },
                    needsManualMapping: false,
                    headerRowIndex
                };
            }
        }
    }

    // ─── 4. Buscador Universal Dinámico de Columnas ─────────────────────────
    let vendorIdx = -1, salesIdx = -1, anuladosIdx = -1, prizesIdx = -1;
    let headerRowIndex = -1;
    let headerVendorColName = '';

    for (let i = 0; i < Math.min(data.length, 30); i++) {
        const row = data[i];
        if (!row || !Array.isArray(row)) continue;
        
        const vIdx = row.findIndex(c => typeof c === 'string' && /venta/i.test(c));
        const pIdx = row.findIndex(c => typeof c === 'string' && /premio|pagado|pago/i.test(c));
        const nIdx = row.findIndex(c => typeof c === 'string' && /nombre|agencia|agentes?|nivel|comercio|taquilla|distribuidor|usuario|vendedor/i.test(c));
        const anIdx = row.findIndex(c => typeof c === 'string' && /anulad/i.test(c));

        if (vIdx !== -1 && nIdx !== -1) {
            salesIdx = vIdx;
            prizesIdx = pIdx;
            vendorIdx = nIdx;
            headerVendorColName = String(row[nIdx] || '');
            anuladosIdx = anIdx !== -1 ? anIdx : -1;
            headerRowIndex = i;
            break;
        }
    }

    // ─── Fallback Extremo de Inteligencia de Datos ───────────────────────────
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
                headerVendorColName = String(row[strIdx] || '');
                headerRowIndex = Math.max(0, i - 1);
                break;
            }
        }
    }

    if (headerRowIndex !== -1) {
        detectedType = 'universal';
        const sessionCurrency = forcedCurrency || detectFileCurrency(fileName, contentStr);
        const effectiveProduct = productName || 'PARLEY';
        const isAgencyCol = /agencia|taquilla/i.test(headerVendorColName);

        data.slice(headerRowIndex + 1).forEach(row => {
            const name = row[vendorIdx];
            const nameStr = String(name || '').trim().toUpperCase();
            
            if (nameStr && !nameStr.includes("TOTAL") && !nameStr.startsWith("-") && nameStr !== "USUARIO" && row[salesIdx] !== undefined) {
                const rawName = nameStr;
                let finalName = rawName;
                let agencyName = isAgencyCol ? rawName : undefined;
                let isAliased = false;
                
                if (sellerAliases[rawName]) {
                    const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawName]);
                    if (mappedSeller) {
                        finalName = mappedSeller.name.toUpperCase();
                        isAliased = true;
                    }
                }
                
                const rawSalesVal = parseAmount(row[salesIdx]);
                const anuladosVal = anuladosIdx !== -1 ? parseAmount(row[anuladosIdx]) : 0;
                const salesVal = rawSalesVal;
                const prizesVal = prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0;

                const sourceItem: ConsolidatedSource = {
                    originalName: rawName,
                    agencyName: agencyName,
                    sales: salesVal,
                    prizes: prizesVal,
                    isAliased
                };

                rows.push({
                    vendorName: finalName,
                    originalName: rawName,
                    agencyName: agencyName,
                    isAliased,
                    sources: [sourceItem],
                    productName: effectiveProduct,
                    sales: salesVal,
                    prizes: prizesVal,
                    sourceRow: {
                        ...row,
                        _currency: sessionCurrency,
                        _productName: effectiveProduct,
                        _agencyName: agencyName,
                        _anulados: anuladosVal
                    }
                });
            }
        });
    }

    if (rows.length === 0) {
        return {
            session: null,
            needsManualMapping: true,
            headerRowIndex
        };
    }

    const sessionCurrency = forcedCurrency || detectFileCurrency(fileName, contentStr);
    const consolidated = new Map<string, RawRow>();
    for (const row of rows) {
        const key = `${row.vendorName.trim().toUpperCase()}||${(row.agencyName || '').trim().toUpperCase()}||${sessionCurrency}`;
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
    const consolidatedRows = Array.from(consolidated.values());

    const fileDate = extractDateFromCells(data) || extractDateFromFilename(fileName) || todayISO();

    return {
        session: {
            fileName,
            productName: productName || 'PARLEY',
            currency: sessionCurrency,
            date: fileDate,
            rows: consolidatedRows,
            detectedType
        },
        needsManualMapping: false,
        headerRowIndex
    };
};
