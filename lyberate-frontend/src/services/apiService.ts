// ─── Lyberate API Service ─────────────────────────────────────────────────────
// Replaces localStorage with REST API calls to the PHP backend.
// All functions are async and match the signatures used by components.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://mi.worlddeportes.com/api';

// ─── Types (re-exported from same definitions) ───────────────────────────────

export type Role = 'Admin' | 'Supervisor' | 'Vendedor' | 'Banca';

export interface AppUser {
    id: string | number;
    name: string;
    email: string;
    password?: string;
    role: Role;
    sellerId?: string | number | null;
    agencyName?: string;
}

export interface SystemPrefs {
    companyName: string;
    ticketFooterMessage: string;
    riskLimitAlert: number;
    baseCurrency: string;
}

export interface CurrencyConfig {
    id: string | number;
    name: string;
    commissionPct: number;
    partPct: number;
}

export interface Product {
    id: string | number;
    name: string;
    currencies: CurrencyConfig[];
}

export interface Seller {
    id: string | number;
    name: string;
    idNumber?: string;
    phone?: string;
    products: Product[];
    createdAt: string;
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'Transferencia' | 'Zelle' | 'Pago Móvil' | 'Efectivo' | 'Otro';
export type PaymentType = 'payment' | 'credit';

export interface Payment {
    id: string | number;
    vendorId: string | number;
    vendorName: string;
    agencyName?: string;
    sellerId: string | number;
    week: string;
    weekId: string;
    amount: number;
    currency: string;
    bank: string;
    method: PaymentMethod;
    reference: string;
    date: string;
    status: PaymentStatus;
    type?: PaymentType;
    proofImageUrl?: string;
    adminNote?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Sale {
    id: string | number;
    sellerId: string | number;
    sellerName: string;
    agencyId?: string | number;
    agencyName?: string;
    productId?: string | number;
    productName: string;
    currencyId?: string | number;
    currencyName: string;
    amount: number;
    prize: number;
    commission: number;
    total: number;
    participation: number;
    totalVendor: number;
    totalBank: number;
    date: string;
    weekId: string;
    registeredAt: string;
    createdAt: string;
}

export interface Agency {
    id: string | number;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    sellerId: string | number;
    sellerName: string;
    createdAt: string;
}

export interface WeeklyTicket {
    id: string | number;
    sellerId: string | number;
    sellerName: string;
    weekId: string;
    weekLabel: string;
    totalSales: number;
    totalPrize: number;
    totalCommission: number;
    totalNet: number;
    totalParticipation: number;
    totalVendor: number;
    totalBank: number;
    totalPaid: number;
    balance: number;
    currency: string;
    status: 'open' | 'settled' | 'pending';
    createdAt: string;
    updatedAt: string;
}

export type ExpenseType = 'Operativo' | 'Nomina' | 'Servicios' | 'Otros';
export interface Expense {
    id: string | number;
    date: string;
    type: ExpenseType;
    concept: string;
    method: PaymentMethod;
    bank: string;
    amount: number;
    currency: string;
    createdAt: string;
}

// ─── HTTP Helpers ────────────────────────────────────────────────────────────

function getToken(): string | null {
    return localStorage.getItem('lyberate_token');
}

function setToken(token: string) {
    localStorage.setItem('lyberate_token', token);
}

export function clearToken() {
    localStorage.removeItem('lyberate_token');
}

async function apiRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    // Only set Content-Type if body exists and is not FormData
    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        cache: 'no-store', // Explicitly disable cache
    });

    const json = await res.json();
    if (!res.ok) {
        throw new Error(json.error || `Error ${res.status}`);
    }
    return json.data !== undefined ? json.data : json;
}

// ─── Mapper functions (snake_case API → camelCase frontend) ──────────────────

function mapUser(u: any): AppUser {
    return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        sellerId: u.seller_id ?? u.sellerId ?? null,
        agencyName: u.agency_name ?? u.agencyName ?? '',
    };
}

function mapSeller(s: any): Seller {
    return {
        id: s.id,
        name: s.name,
        idNumber: s.id_number ?? s.idNumber ?? '',
        phone: s.phone ?? '',
        products: (s.products || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            currencies: (p.currencies || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                commissionPct: Number(c.commission_pct ?? c.commissionPct ?? 0),
                partPct: Number(c.part_pct ?? c.partPct ?? 0),
            })),
        })),
        createdAt: s.created_at ?? s.createdAt ?? '',
    };
}

function mapSale(s: any): Sale {
    return {
        id: s.id,
        sellerId: s.seller_id ?? s.sellerId,
        sellerName: s.seller_name ?? s.sellerName ?? '',
        agencyId: s.agency_id ?? s.agencyId ?? undefined,
        agencyName: s.agency_name ?? s.agencyName ?? undefined,
        productId: s.product_id ?? s.productId ?? undefined,
        productName: s.product_name ?? s.productName ?? '',
        currencyId: s.currency_id ?? s.currencyId ?? undefined,
        currencyName: s.currency_name ?? s.currencyName ?? '',
        amount: Number(s.amount),
        prize: Number(s.prize ?? 0),
        commission: Number(s.commission ?? 0),
        total: Number(s.total ?? 0),
        participation: Number(s.participation ?? 0),
        totalVendor: Number(s.total_vendor ?? s.totalVendor ?? 0),
        totalBank: Number(s.total_bank ?? s.totalBank ?? 0),
        date: s.sale_date ?? s.date ?? '',
        weekId: s.week_id ?? s.weekId ?? '',
        registeredAt: s.registered_at ?? s.registeredAt ?? '',
        createdAt: s.created_at ?? s.createdAt ?? '',
    };
}

function mapPayment(p: any): Payment {
    // Build full proof image URL from relative path
    const proofPath = p.proof_image_path ?? p.proofImagePath;
    const proofImageUrl = proofPath ? `${API_BASE}/${proofPath}` : undefined;

    return {
        id: p.id,
        vendorId: p.user_id ?? p.vendorId,
        vendorName: p.vendor_name ?? p.vendorName ?? '',
        agencyName: p.agency_name ?? p.agencyName ?? '',
        sellerId: p.seller_id ?? p.sellerId,
        week: p.week_label ?? p.week ?? '',
        weekId: p.week_id ?? p.weekId ?? '',
        amount: Number(p.amount),
        currency: p.currency ?? '',
        bank: p.bank ?? '',
        method: p.method,
        reference: p.reference ?? '',
        date: p.payment_date ?? p.date ?? '',
        status: p.status,
        type: p.type ?? 'payment',
        proofImageUrl,
        adminNote: p.admin_note ?? p.adminNote ?? '',
        createdAt: p.created_at ?? p.createdAt ?? '',
        updatedAt: p.updated_at ?? p.updatedAt ?? '',
    };
}

function mapAgency(a: any): Agency {
    return {
        id: a.id,
        name: a.name,
        address: a.address ?? '',
        phone: a.phone ?? '',
        email: a.email ?? '',
        sellerId: a.seller_id ?? a.sellerId,
        sellerName: a.seller_name ?? a.sellerName ?? '',
        createdAt: a.created_at ?? a.createdAt ?? '',
    };
}

function mapWeeklyTicket(t: any): WeeklyTicket {
    return {
        id: t.id,
        sellerId: t.seller_id ?? t.sellerId,
        sellerName: t.seller_name ?? t.sellerName ?? '',
        weekId: t.week_id ?? t.weekId ?? '',
        weekLabel: t.week_label ?? t.weekLabel ?? '',
        totalSales: Number(t.total_sales ?? t.totalSales ?? 0),
        totalPrize: Number(t.total_prize ?? t.totalPrize ?? 0),
        totalCommission: Number(t.total_commission ?? t.totalCommission ?? 0),
        totalNet: Number(t.total_net ?? t.totalNet ?? 0),
        totalParticipation: Number(t.total_participation ?? t.totalParticipation ?? 0),
        totalVendor: Number(t.total_vendor ?? t.totalVendor ?? 0),
        totalBank: Number(t.total_bank ?? t.totalBank ?? 0),
        totalPaid: Number(t.total_paid ?? t.totalPaid ?? 0),
        balance: Number(t.balance ?? 0),
        currency: t.currency ?? '',
        status: t.status ?? 'open',
        createdAt: t.created_at ?? t.createdAt ?? '',
        updatedAt: t.updated_at ?? t.updatedAt ?? '',
    };
}

function mapExpense(e: any): Expense {
    return {
        id: e.id,
        date: e.expense_date ?? e.date ?? '',
        type: e.type,
        concept: e.concept ?? '',
        method: e.method,
        bank: e.bank ?? '',
        amount: Number(e.amount),
        currency: e.currency ?? '',
        createdAt: e.created_at ?? e.createdAt ?? '',
    };
}

// ─── Weekly Period Utils (kept client-side, same logic) ──────────────────────

export interface WeekPeriod {
    id: string;
    label: string;
    startDate: Date;
    endDate: Date;
}

export const dateToWeekId = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `week-${y}-${m}-${dd}`;
};

export const getWeeklyPeriods = (extraDates: string[] = [], defaultCount = 8): WeekPeriod[] => {
    const weekIds = new Set<string>();
    const today = new Date();
    for (let i = 0; i < defaultCount; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i * 7);
        weekIds.add(dateToWeekId(d));
    }
    for (const dateStr of extraDates) {
        if (dateStr) weekIds.add(dateToWeekId(dateStr));
    }
    const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const periods: WeekPeriod[] = Array.from(weekIds).map(id => {
        const datePart = id.replace('week-', '');
        const start = new Date(datePart + 'T00:00:00');
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { id, label: `Lun ${fmt(start)} — Dom ${fmt(end)}`, startDate: start, endDate: end };
    });
    periods.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    return periods;
};

// ─── No-op init (no longer needed) ──────────────────────────────────────────

export const initLocalStore = () => {
    // No-op: backend handles initialization via SQL seeds
};

// ─── Auth / Session ─────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string): Promise<AppUser | null> {
    try {
        const res = await apiRequest<{ token: string; user: any }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        setToken(res.token);
        return mapUser(res.user);
    } catch {
        return null;
    }
}

export async function loadSession(): Promise<AppUser | null> {
    const token = getToken();
    if (!token) return null;
    try {
        const user = await apiRequest('/auth/me');
        return mapUser(user);
    } catch {
        clearToken();
        return null;
    }
}

export function clearSession() {
    clearToken();
}

// Legacy sync wrapper for AuthContext compatibility
export function findUserByCredentials(_email: string, _password: string): AppUser | null {
    // This is now async via loginUser. Kept for type compatibility.
    console.warn('findUserByCredentials is deprecated. Use loginUser() instead.');
    return null;
}

export function saveSession(_user: AppUser) {
    // Session is managed by JWT token, no-op
}

// ─── User Helpers ───────────────────────────────────────────────────────────

export async function getUsers(): Promise<AppUser[]> {
    const data = await apiRequest('/users');
    return (data as any[]).map(mapUser);
}

export async function addUser(user: Omit<AppUser, 'id'>): Promise<AppUser> {
    const payload: any = {
        name: user.name,
        email: user.email,
        password: user.password || '',
        role: user.role,
        seller_id: user.sellerId || null,
        agency_name: user.agencyName || null,
    };
    const data = await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return mapUser(data);
}

export async function updateUser(updated: AppUser): Promise<void> {
    const payload: any = {
        name: updated.name,
        email: updated.email,
        role: updated.role,
        seller_id: updated.sellerId || null,
        agency_name: updated.agencyName || null,
    };
    if (updated.password) {
        payload.password = updated.password;
    }
    await apiRequest(`/users/${updated.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function deleteUser(userId: string | number): Promise<boolean> {
    try {
        await apiRequest(`/users/${userId}`, { method: 'DELETE' });
        return true;
    } catch {
        return false;
    }
}

export async function getUserBySellerId(sellerId: string | number): Promise<AppUser | undefined> {
    const users = await getUsers();
    return users.find(u => String(u.sellerId) === String(sellerId));
}

export async function deleteUserBySellerId(sellerId: string | number): Promise<void> {
    const user = await getUserBySellerId(sellerId);
    if (user) await deleteUser(user.id);
}

// ─── Seller Helpers ─────────────────────────────────────────────────────────

export async function getSellers(): Promise<Seller[]> {
    const data = await apiRequest('/sellers');
    return (data as any[]).map(mapSeller);
}

export async function addSeller(seller: Omit<Seller, 'id' | 'createdAt'>): Promise<Seller> {
    const payload = {
        name: seller.name,
        id_number: seller.idNumber || null,
        phone: seller.phone || null,
        products: (seller.products || []).map(p => ({
            name: p.name,
            currencies: (p.currencies || []).map(c => ({
                name: c.name,
                commission_pct: c.commissionPct,
                part_pct: c.partPct,
            })),
        })),
    };
    const data = await apiRequest('/sellers', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return mapSeller(data);
}

export async function updateSeller(updated: Seller): Promise<void> {
    const payload = {
        name: updated.name,
        id_number: updated.idNumber || null,
        phone: updated.phone || null,
        products: (updated.products || []).map(p => ({
            name: p.name,
            currencies: (p.currencies || []).map(c => ({
                name: c.name,
                commission_pct: c.commissionPct,
                part_pct: c.partPct,
            })),
        })),
    };
    await apiRequest(`/sellers/${updated.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function deleteSeller(sellerId: string | number): Promise<void> {
    await apiRequest(`/sellers/${sellerId}`, { method: 'DELETE' });
}

// ─── Payment Helpers ────────────────────────────────────────────────────────

export async function getPayments(): Promise<Payment[]> {
    const data = await apiRequest('/payments');
    return (data as any[]).map(mapPayment);
}

export async function getPaymentsByVendor(sellerId: string | number): Promise<Payment[]> {
    const data = await apiRequest(`/payments/vendor/${sellerId}`);
    return (data as any[]).map(mapPayment);
}

export async function addPayment(payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'> & { proofBase64?: string }): Promise<Payment> {
    const payload: any = {
        seller_id: payment.sellerId,
        week_label: payment.week,
        week_id: payment.weekId,
        amount: Math.abs(payment.amount),
        currency: payment.currency,
        bank: payment.bank,
        method: payment.method,
        reference: payment.reference,
        payment_date: payment.date,
        status: payment.status || 'pending',
        type: payment.type || 'payment',
        admin_note: payment.adminNote || null,
    };
    // Handle base64 proof upload
    if (payment.proofBase64) {
        payload.proof_base64 = payment.proofBase64;
    }
    const data = await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return mapPayment(data);
}

export async function updatePaymentStatus(
    paymentId: string | number,
    status: PaymentStatus,
    adminNote?: string
): Promise<boolean> {
    try {
        await apiRequest(`/payments/${paymentId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, admin_note: adminNote }),
        });
        return true;
    } catch {
        return false;
    }
}

// ─── Sales ──────────────────────────────────────────────────────────────────

export async function getSales(): Promise<Sale[]> {
    const data = await apiRequest('/sales');
    return (data as any[]).map(mapSale);
}

export async function addSale(sale: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale> {
    const payload = {
        seller_id: sale.sellerId,
        agency_id: sale.agencyId || null,
        product_name: sale.productName,
        currency_name: sale.currencyName,
        amount: sale.amount,
        prize: sale.prize || 0,
        commission: sale.commission || 0,
        total: sale.total || 0,
        participation: sale.participation || 0,
        total_vendor: sale.totalVendor || 0,
        total_bank: sale.totalBank || 0,
        sale_date: sale.date,
        week_id: sale.weekId,
        registered_at: sale.registeredAt || new Date().toISOString(),
    };
    const data = await apiRequest('/sales', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return mapSale(data);
}

export async function deleteSale(saleId: string | number): Promise<void> {
    await apiRequest(`/sales/${saleId}`, { method: 'DELETE' });
}

// ─── Agency Helpers ─────────────────────────────────────────────────────────

export async function getAgencies(): Promise<Agency[]> {
    const data = await apiRequest('/agencies');
    return (data as any[]).map(mapAgency);
}

export async function getAgenciesBySeller(sellerId: string | number): Promise<Agency[]> {
    const data = await apiRequest(`/agencies?seller_id=${sellerId}`);
    return (data as any[]).map(mapAgency);
}

export async function addAgency(agency: Omit<Agency, 'id' | 'createdAt'>): Promise<Agency> {
    const payload = {
        name: agency.name,
        address: agency.address || null,
        phone: agency.phone || null,
        email: agency.email || null,
        seller_id: agency.sellerId,
    };
    const data = await apiRequest('/agencies', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return mapAgency(data);
}

export async function updateAgency(updated: Agency): Promise<void> {
    const payload = {
        name: updated.name,
        address: updated.address || null,
        phone: updated.phone || null,
        email: updated.email || null,
        seller_id: updated.sellerId,
    };
    await apiRequest(`/agencies/${updated.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function deleteAgency(agencyId: string | number): Promise<void> {
    await apiRequest(`/agencies/${agencyId}`, { method: 'DELETE' });
}

// ─── Weekly Ticket Helpers ──────────────────────────────────────────────────

export async function getWeeklyTickets(): Promise<WeeklyTicket[]> {
    const data = await apiRequest('/weekly-tickets');
    return (data as any[]).map(mapWeeklyTicket);
}

export async function getWeeklyTicketsBySeller(sellerId: string | number): Promise<WeeklyTicket[]> {
    const data = await apiRequest(`/weekly-tickets?seller_id=${sellerId}`);
    return (data as any[]).map(mapWeeklyTicket);
}

export async function upsertWeeklyTicket(
    ticket: Omit<WeeklyTicket, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WeeklyTicket> {
    const payload = {
        seller_id: ticket.sellerId,
        week_id: ticket.weekId,
        week_label: ticket.weekLabel,
        total_sales: ticket.totalSales,
        total_prize: ticket.totalPrize,
        total_commission: ticket.totalCommission,
        total_net: ticket.totalNet,
        total_participation: ticket.totalParticipation,
        total_vendor: ticket.totalVendor,
        total_bank: ticket.totalBank,
        total_paid: ticket.totalPaid,
        balance: ticket.balance,
        currency: ticket.currency,
        status: ticket.status,
    };
    const data = await apiRequest('/weekly-tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return mapWeeklyTicket(data);
}

export async function updateWeeklyTicketStatus(
    ticketId: string | number,
    status: WeeklyTicket['status']
): Promise<void> {
    await apiRequest(`/weekly-tickets/${ticketId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
    });
}

// ─── Expense Helpers ────────────────────────────────────────────────────────

export async function getExpenses(): Promise<Expense[]> {
    const data = await apiRequest('/expenses');
    return (data as any[]).map(mapExpense);
}

export async function addExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    const payload = {
        expense_date: expense.date,
        type: expense.type,
        concept: expense.concept,
        method: expense.method,
        bank: expense.bank,
        amount: expense.amount,
        currency: expense.currency,
    };
    const data = await apiRequest('/expenses', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return mapExpense(data);
}

export async function deleteExpense(expenseId: string | number): Promise<void> {
    await apiRequest(`/expenses/${expenseId}`, { method: 'DELETE' });
}

// ─── System Preferences ────────────────────────────────────────────────────

export async function getSystemPrefs(): Promise<SystemPrefs> {
    const data = await apiRequest('/settings/prefs');
    return {
        companyName: data.companyName ?? 'WORLD DEPORTES',
        ticketFooterMessage: data.ticketFooterMessage ?? '',
        riskLimitAlert: Number(data.riskLimitAlert ?? 500),
        baseCurrency: data.baseCurrency ?? 'DOLAR',
    };
}

export async function updateSystemPrefs(prefs: SystemPrefs): Promise<void> {
    await apiRequest('/settings/prefs', {
        method: 'PUT',
        body: JSON.stringify(prefs),
    });
}

// ─── Currencies ─────────────────────────────────────────────────────────────

export async function getAvailableCurrencies(): Promise<string[]> {
    const data = await apiRequest('/settings/currencies');
    return (data as any[]).map((c: any) => c.name);
}

export async function addAvailableCurrency(name: string): Promise<boolean> {
    try {
        await apiRequest('/settings/currencies', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
        return true;
    } catch {
        return false;
    }
}

export async function updateAvailableCurrency(oldName: string, newName: string): Promise<boolean> {
    try {
        const data = await apiRequest('/settings/currencies');
        const currency = (data as any[]).find((c: any) => c.name === oldName);
        if (!currency) return false;
        await apiRequest(`/settings/currencies/${currency.id}`, {
            method: 'PUT',
            body: JSON.stringify({ name: newName }),
        });
        return true;
    } catch {
        return false;
    }
}

export async function deleteAvailableCurrency(name: string): Promise<void> {
    // Need to find ID by name first
    const data = await apiRequest('/settings/currencies');
    const currency = (data as any[]).find((c: any) => c.name === name);
    if (currency) {
        await apiRequest(`/settings/currencies/${currency.id}`, { method: 'DELETE' });
    }
}

// ─── Global Products ────────────────────────────────────────────────────────

export async function getGlobalProducts(): Promise<string[]> {
    const data = await apiRequest('/settings/products');
    return (data as any[]).map((p: any) => p.name);
}

export async function addGlobalProduct(name: string): Promise<boolean> {
    try {
        await apiRequest('/settings/products', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
        return true;
    } catch {
        return false;
    }
}

export async function updateGlobalProduct(oldName: string, newName: string): Promise<boolean> {
    try {
        const data = await apiRequest('/settings/products');
        const product = (data as any[]).find((p: any) => p.name === oldName);
        if (!product) return false;

        await apiRequest(`/settings/products/${product.id}`, {
            method: 'PUT',
            body: JSON.stringify({ name: newName }),
        });
        return true;
    } catch {
        return false;
    }
}

export async function deleteGlobalProduct(name: string): Promise<void> {
    const data = await apiRequest('/settings/products');
    const product = (data as any[]).find((p: any) => p.name === name);
    if (product) {
        await apiRequest(`/settings/products/${product.id}`, { method: 'DELETE' });
    }
}

// ─── Dashboard Stats ────────────────────────────────────────────────────────

export async function getDashboardStats(weekId?: string): Promise<any> {
    const qs = weekId ? `?week_id=${weekId}` : '';
    return await apiRequest(`/dashboard/stats${qs}`);
}
