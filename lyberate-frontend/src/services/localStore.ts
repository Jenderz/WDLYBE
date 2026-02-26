// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = 'Admin' | 'Supervisor' | 'Vendedor' | 'Banca';

export interface AppUser {
    id: string;
    name: string;
    email: string;
    password: string; // plain text for local mode; replace with hash before going to production
    role: Role;
    sellerId?: string; // links to Seller.id
    agencyName?: string;
}

export interface CurrencyConfig {
    id: string;
    name: string;
    commissionPct: number;
    partPct: number;
}

export interface Product {
    id: string;
    name: string;
    currencies: CurrencyConfig[];
}

export interface Product {
    id: string;
    name: string;
    currencies: CurrencyConfig[];
}

export interface Seller {
    id: string;
    name: string;
    idNumber?: string;
    phone?: string;
    products: Product[];
    createdAt: string;
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'Transferencia' | 'Zelle' | 'Pago Móvil' | 'Efectivo' | 'Otro';

export interface Payment {
    id: string;
    vendorId: string;       // AppUser.id
    vendorName: string;
    agencyName?: string;    // Deprecated / Optional
    sellerId: string;       // links to Seller.id
    week: string;           // label e.g. "Lun 17 Feb - Lun 24 Feb"
    weekId: string;         // identifier e.g. "week-0"
    amount: number;
    currency: string;
    bank: string;
    method: PaymentMethod;
    reference: string;
    date: string;
    status: PaymentStatus;
    proofImageBase64?: string; // base64 encoded image
    proofMimeType?: string;
    adminNote?: string;
    createdAt: string;      // ISO timestamp
    updatedAt: string;
}

export interface Sale {
    id: string;
    sellerId: string;
    sellerName: string;
    agencyId?: string;    // Opcional: ID de agencia específica
    agencyName?: string;  // Opcional: nombre de agencia (null = consolidado)
    productId: string;
    productName: string;
    currencyId: string;
    currencyName: string;
    amount: number;       // Venta
    prize: number;        // Premio
    commission: number;   // Comisión calculada
    total: number;        // Venta - Premio - Comisión
    participation: number;// Participación calculada
    totalVendor: number;  // Comision + Participacion
    totalBank: number;    // Total - Participacion
    date: string;         // ISO date or simple YYYY-MM-DD
    weekId: string;       // Identifier for the week exactly
    registeredAt: string; // Exact ISO timestamp when form submitted
    createdAt: string;
}

// Agencia: directorio de sucursales de un vendedor
export interface Agency {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    sellerId: string;    // Seller al que pertenece
    sellerName: string;
    createdAt: string;
}

// Ticket de cierre semanal por vendedor y moneda
export interface WeeklyTicket {
    id: string;
    sellerId: string;
    sellerName: string;
    weekId: string;
    weekLabel: string;
    totalSales: number;       // Suma de amount
    totalPrize: number;       // Suma de prize
    totalCommission: number;  // Suma de commission
    totalNet: number;         // Suma de total
    totalParticipation: number;
    totalVendor: number;      // Lo que se queda el vendedor
    totalBank: number;        // Lo que le corresponde a la banca
    totalPaid: number;        // Pagos aprobados en la semana
    balance: number;          // totalBank - totalPaid (+ = vendedor debe; - = banca debe)
    currency: string;
    status: 'open' | 'settled' | 'pending';
    createdAt: string;
    updatedAt: string;
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

const KEYS = {
    USERS: 'lyberate_users',
    PAYMENTS: 'lyberate_payments',
    SELLERS: 'lyberate_sellers',
    SESSION: 'lyberate_session',
    CURRENCIES: 'lyberate_currencies',
    GLOBAL_PRODUCTS: 'lyberate_global_products',
    SALES: 'lyberate_sales',
    AGENCIES: 'lyberate_agencies',
    WEEKLY_TICKETS: 'lyberate_weekly_tickets',
    SEEDED_V2: 'lyberate_seeded_v2',
} as const;

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_SELLERS: Seller[] = [
    {
        id: 'v1',
        name: 'Jhon Doe',
        idNumber: 'V-12345678',
        phone: '0414-0000000',
        createdAt: new Date('2026-01-01').toISOString(),
        products: [
            {
                id: 'p1',
                name: 'PARLEY BETM3',
                currencies: [
                    { id: 'c1', name: 'USD', commissionPct: 10, partPct: 25 },
                    { id: 'c2', name: 'Bolívares', commissionPct: 10, partPct: 40 },
                ]
            }
        ]
    },
    {
        id: 'v2',
        name: 'EL YUCA',
        idNumber: 'V-87654321',
        phone: '0412-1111111',
        createdAt: new Date('2026-01-10').toISOString(),
        products: [
            {
                id: 'p2',
                name: 'ANIMALITOS',
                currencies: [
                    { id: 'c3', name: 'USD', commissionPct: 15, partPct: 20 },
                    { id: 'c4', name: 'Bolívares', commissionPct: 15, partPct: 35 },
                ]
            }
        ]
    }
];

const SEED_USERS: AppUser[] = [
    {
        id: 'u-001',
        name: 'Admin Central',
        email: 'admin@lyberate.com',
        password: 'admin123',
        role: 'Admin',
    },
    {
        id: 'u-003',
        name: 'Jhon Doe',
        email: 'jhon@lyberate.com',
        password: 'vend123',
        role: 'Vendedor',
        sellerId: 'v1',
        agencyName: 'Agencia Centro',
    },
    {
        id: 'u-004',
        name: 'EL YUCA',
        email: 'yuca@lyberate.com',
        password: 'vend456',
        role: 'Vendedor',
        sellerId: 'v2',
        agencyName: 'Agencia Yuca',
    },
];

const SEED_PAYMENTS: Payment[] = [
    {
        id: 'pay-001',
        vendorId: 'u-003',
        vendorName: 'Jhon Doe',
        agencyName: 'Agencia Centro',
        sellerId: 'v1',
        week: 'Semana actual',
        weekId: 'week-0',
        amount: 850.00,
        currency: 'USD',
        bank: 'Banesco',
        method: 'Transferencia',
        reference: 'REF-20240201-001',
        date: '2026-02-17',
        status: 'approved',
        createdAt: new Date('2026-02-17').toISOString(),
        updatedAt: new Date('2026-02-18').toISOString(),
    },
];

const SEED_SALES: Sale[] = [];

// ─── Functions ────────────────────────────────────────────────────────────────

// Initialize data if not present or seed updated required
export const initLocalStore = () => {
    const isSeeded = localStorage.getItem(KEYS.SEEDED_V2) === 'true';
    if (!isSeeded) {
        localStorage.setItem(KEYS.USERS, JSON.stringify(SEED_USERS));
        localStorage.setItem(KEYS.SELLERS, JSON.stringify(SEED_SELLERS));
        localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(SEED_PAYMENTS));
        localStorage.setItem(KEYS.CURRENCIES, JSON.stringify(['DOLAR', 'PESO COLOMBIANA', 'BOLIVARES VENEZOLANOS']));
        localStorage.setItem(KEYS.GLOBAL_PRODUCTS, JSON.stringify(['PARLEY BETM3', 'ANIMALITOS', 'LOTERIAS', 'AMERICANAS']));
        localStorage.setItem(KEYS.SALES, JSON.stringify(SEED_SALES));
        localStorage.setItem(KEYS.AGENCIES, JSON.stringify([]));
        localStorage.setItem(KEYS.WEEKLY_TICKETS, JSON.stringify([]));
        localStorage.setItem(KEYS.SEEDED_V2, 'true');
    } else {
        // Ensure properties exist for older seeded data
        if (!localStorage.getItem(KEYS.CURRENCIES)) {
            localStorage.setItem(KEYS.CURRENCIES, JSON.stringify(['DOLAR', 'PESO COLOMBIANA', 'BOLIVARES VENEZOLANOS']));
        }
        if (!localStorage.getItem(KEYS.GLOBAL_PRODUCTS)) {
            localStorage.setItem(KEYS.GLOBAL_PRODUCTS, JSON.stringify(['PARLEY BETM3', 'ANIMALITOS', 'LOTERIAS', 'AMERICANAS']));
        }
        if (!localStorage.getItem(KEYS.SALES)) {
            localStorage.setItem(KEYS.SALES, JSON.stringify([]));
        }
        if (!localStorage.getItem(KEYS.AGENCIES)) {
            localStorage.setItem(KEYS.AGENCIES, JSON.stringify([]));
        }
        if (!localStorage.getItem(KEYS.WEEKLY_TICKETS)) {
            localStorage.setItem(KEYS.WEEKLY_TICKETS, JSON.stringify([]));
        }
    }
};

// ─── User Helpers ─────────────────────────────────────────────────────────────

export function getUsers(): AppUser[] {
    return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
}

export function findUserByCredentials(email: string, password: string): AppUser | null {
    const users = getUsers();
    return users.find(u => u.email === email && u.password === password) ?? null;
}

export function addUser(user: Omit<AppUser, 'id'>): AppUser {
    const users = getUsers();
    const newUser = { ...user, id: `u-${Date.now()}` };
    users.push(newUser);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    return newUser;
}

// ─── Session Helpers ──────────────────────────────────────────────────────────

export function saveSession(user: AppUser) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
}

export function loadSession(): AppUser | null {
    const raw = localStorage.getItem(KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
    localStorage.removeItem(KEYS.SESSION);
}

// ─── Seller Helpers ───────────────────────────────────────────────────────────

export function getSellers(): Seller[] {
    return JSON.parse(localStorage.getItem(KEYS.SELLERS) || '[]');
}

export function addSeller(seller: Omit<Seller, 'id' | 'createdAt'>): Seller {
    const sellers = getSellers();
    const newSeller: Seller = {
        ...seller,
        id: `v-${Date.now()}`,
        createdAt: new Date().toISOString(),
    };
    sellers.push(newSeller);
    localStorage.setItem(KEYS.SELLERS, JSON.stringify(sellers));
    return newSeller;
}

export function updateSeller(updated: Seller) {
    const sellers = getSellers();
    const idx = sellers.findIndex(s => s.id === updated.id);
    if (idx === -1) return;
    sellers[idx] = updated;
    localStorage.setItem(KEYS.SELLERS, JSON.stringify(sellers));
}

// ─── Payment Helpers ──────────────────────────────────────────────────────────

export const getPayments = (): Payment[] => {
    return JSON.parse(localStorage.getItem(KEYS.PAYMENTS) || '[]');
};

export function getPaymentsByVendor(vendorId: string): Payment[] {
    return getPayments().filter(p => p.vendorId === vendorId);
}

export const addPayment = (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const payments = getPayments();
    const newPayment: Payment = {
        ...payment,
        id: `pay-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    payments.push(newPayment);
    localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));
    return newPayment;
};

export const updatePaymentStatus = (paymentId: string, status: PaymentStatus, adminNote?: string) => {
    const payments = getPayments();
    const index = payments.findIndex(p => p.id === paymentId);
    if (index !== -1) {
        payments[index].status = status;
        if (adminNote) payments[index].adminNote = adminNote;
        payments[index].updatedAt = new Date().toISOString();
        localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));
        return true;
    }
    return false;
};

// --- Currencies ---

export const getAvailableCurrencies = (): string[] => {
    return JSON.parse(localStorage.getItem(KEYS.CURRENCIES) || '["DOLAR", "PESO COLOMBIANA", "BOLIVARES VENEZOLANOS"]');
};

export const addAvailableCurrency = (name: string) => {
    const currencies = getAvailableCurrencies();
    const upperName = name.trim().toUpperCase();
    if (upperName && !currencies.includes(upperName)) {
        currencies.push(upperName);
        localStorage.setItem(KEYS.CURRENCIES, JSON.stringify(currencies));
        return true;
    }
    return false;
};

export const deleteAvailableCurrency = (name: string) => {
    let currencies = getAvailableCurrencies();
    currencies = currencies.filter(c => c !== name);
    localStorage.setItem(KEYS.CURRENCIES, JSON.stringify(currencies));
};

// --- Global Products ---

export const getGlobalProducts = (): string[] => {
    return JSON.parse(localStorage.getItem(KEYS.GLOBAL_PRODUCTS) || '["PARLEY BETM3", "ANIMALITOS", "LOTERIAS", "AMERICANAS"]');
};

export const addGlobalProduct = (name: string) => {
    const products = getGlobalProducts();
    const upperName = name.trim().toUpperCase();
    if (upperName && !products.includes(upperName)) {
        products.push(upperName);
        localStorage.setItem(KEYS.GLOBAL_PRODUCTS, JSON.stringify(products));
        return true;
    }
    return false;
};

export const deleteGlobalProduct = (name: string) => {
    let products = getGlobalProducts();
    products = products.filter(p => p !== name);
    localStorage.setItem(KEYS.GLOBAL_PRODUCTS, JSON.stringify(products));
};

// --- Sales ---

export const getSales = (): Sale[] => {
    return JSON.parse(localStorage.getItem(KEYS.SALES) || '[]');
};

export const addSale = (sale: Omit<Sale, 'id' | 'createdAt'>) => {
    const sales = getSales();
    const newSale: Sale = {
        ...sale,
        id: `sale-${Date.now()}`,
        createdAt: new Date().toISOString(),
    };
    sales.push(newSale);
    localStorage.setItem(KEYS.SALES, JSON.stringify(sales));
    return newSale;
};

export const deleteSale = (saleId: string) => {
    const sales = getSales().filter(s => s.id !== saleId);
    localStorage.setItem(KEYS.SALES, JSON.stringify(sales));
};

// ─── Agency Helpers ───────────────────────────────────────────────────────────

export const getAgencies = (): Agency[] => {
    return JSON.parse(localStorage.getItem(KEYS.AGENCIES) || '[]');
};

export const getAgenciesBySeller = (sellerId: string): Agency[] => {
    return getAgencies().filter(a => a.sellerId === sellerId);
};

export const addAgency = (agency: Omit<Agency, 'id' | 'createdAt'>): Agency => {
    const agencies = getAgencies();
    const newAgency: Agency = {
        ...agency,
        id: `agency-${Date.now()}`,
        createdAt: new Date().toISOString(),
    };
    agencies.push(newAgency);
    localStorage.setItem(KEYS.AGENCIES, JSON.stringify(agencies));
    return newAgency;
};

export const updateAgency = (updated: Agency) => {
    const agencies = getAgencies();
    const idx = agencies.findIndex(a => a.id === updated.id);
    if (idx !== -1) {
        agencies[idx] = updated;
        localStorage.setItem(KEYS.AGENCIES, JSON.stringify(agencies));
    }
};

export const deleteAgency = (agencyId: string) => {
    const agencies = getAgencies().filter(a => a.id !== agencyId);
    localStorage.setItem(KEYS.AGENCIES, JSON.stringify(agencies));
};

// ─── Weekly Ticket Helpers ────────────────────────────────────────────────────

export const getWeeklyTickets = (): WeeklyTicket[] => {
    return JSON.parse(localStorage.getItem(KEYS.WEEKLY_TICKETS) || '[]');
};

export const getWeeklyTicketsBySeller = (sellerId: string): WeeklyTicket[] => {
    return getWeeklyTickets().filter(t => t.sellerId === sellerId);
};

export const upsertWeeklyTicket = (ticket: Omit<WeeklyTicket, 'id' | 'createdAt' | 'updatedAt'>): WeeklyTicket => {
    const tickets = getWeeklyTickets();
    const existing = tickets.find(t => t.sellerId === ticket.sellerId && t.weekId === ticket.weekId && t.currency === ticket.currency);
    const now = new Date().toISOString();
    if (existing) {
        const updated = { ...existing, ...ticket, updatedAt: now };
        const idx = tickets.findIndex(t => t.id === existing.id);
        tickets[idx] = updated;
        localStorage.setItem(KEYS.WEEKLY_TICKETS, JSON.stringify(tickets));
        return updated;
    }
    const newTicket: WeeklyTicket = {
        ...ticket,
        id: `wt-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
    };
    tickets.push(newTicket);
    localStorage.setItem(KEYS.WEEKLY_TICKETS, JSON.stringify(tickets));
    return newTicket;
};

export const updateWeeklyTicketStatus = (ticketId: string, status: WeeklyTicket['status']) => {
    const tickets = getWeeklyTickets();
    const idx = tickets.findIndex(t => t.id === ticketId);
    if (idx !== -1) {
        tickets[idx].status = status;
        tickets[idx].updatedAt = new Date().toISOString();
        localStorage.setItem(KEYS.WEEKLY_TICKETS, JSON.stringify(tickets));
    }
};
