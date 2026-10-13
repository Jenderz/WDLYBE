export interface ConsolidatedSource {
    originalName: string;
    agencyName?: string;
    sales: number;
    prizes: number;
    isAliased?: boolean;
}

export interface RawRow {
    vendorName: string;
    originalName?: string;
    isAliased?: boolean;
    sources?: ConsolidatedSource[];
    agencyName?: string;
    productName?: string; // Sub-producto individual (ej. "PARLEY 4+", "PARLEY 3L", "PARLEY 2L", "PARLEY PD")
    sales: number;
    prizes: number;
    sourceRow: any;
}

export interface ImportSession {
    fileName: string;
    productName: string;
    currency: string;
    date: string; // YYYY-MM-DD
    rows: RawRow[];
    detectedType: 'betm3' | 'banklot' | 'maxplay' | 'gato' | 'americanas' | 'mastergreen' | 'adminwd' | 'parley' | 'universal' | 'unknown';
}

export interface VendorProductPendingConfig {
    productName: string;
    currency: string;
    commissionPct: number;
    partPct: number;
    isConfiguredInDb?: boolean;
}

export interface VendorConfig {
    name: string;
    commissionPct: number;
    partPct: number;
    mappedSellerId?: number | null;
    isExisting?: boolean;
    products?: VendorProductPendingConfig[];
}

export interface ManualRawData {
    fileName: string;
    data: any[][];
}

export type ImportStep = 'upload' | 'preview' | 'resolution' | 'manual' | 'success';

export interface SalesImportModalProps {
    onClose: () => void;
    onImportSuccess: () => void;
}
