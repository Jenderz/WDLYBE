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

export interface Agency {
    id: string;
    name: string;
    products: Product[];
}

export interface Seller {
    id: string;
    name: string;
    idNumber?: string;
    phone?: string;
    agencies: Agency[];
    createdAt: string;
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'Transferencia' | 'Zelle' | 'Pago Móvil' | 'Efectivo' | 'Otro';

export interface Payment {
    id: string;
    vendorId: string;       // AppUser.id
    vendorName: string;
    agencyName: string;
    sellerId: string;       // links to Seller.id
    week: string;           // e.g. "Lun 17 Feb - Lun 24 Feb"
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

// ─── Keys ─────────────────────────────────────────────────────────────────────

const KEYS = {
    USERS: 'lyberate_users',
    PAYMENTS: 'lyberate_payments',
    SELLERS: 'lyberate_sellers',
    SESSION: 'lyberate_session',
    SEEDED_V2: 'lyberate_seeded_v2', // bumped seed key
} as const;

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_SELLERS: Seller[] = [
    {
        id: 'v1',
        name: 'Jhon Doe',
        idNumber: 'V-12345678',
        phone: '0414-0000000',
        createdAt: new Date('2026-01-01').toISOString(),
        agencies: [
            {
                id: 'a1',
                name: 'Agencia Centro',
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
            }
        ]
    },
    {
        id: 'v2',
        name: 'EL YUCA',
        idNumber: 'V-87654321',
        phone: '0412-1111111',
        createdAt: new Date('2026-01-10').toISOString(),
        agencies: [
            {
                id: 'a2',
                name: 'Agencia Yuca',
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

// ─── Initialization ───────────────────────────────────────────────────────────

export function initializeStore() {
    if (localStorage.getItem(KEYS.SEEDED_V2)) return;
    localStorage.setItem(KEYS.USERS, JSON.stringify(SEED_USERS));
    localStorage.setItem(KEYS.SELLERS, JSON.stringify(SEED_SELLERS));
    localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(SEED_PAYMENTS));
    localStorage.setItem(KEYS.SEEDED_V2, 'true');
}

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

export function getPayments(): Payment[] {
    return JSON.parse(localStorage.getItem(KEYS.PAYMENTS) || '[]');
}

export function getPaymentsByVendor(vendorId: string): Payment[] {
    return getPayments().filter(p => p.vendorId === vendorId);
}

export function addPayment(payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Payment {
    const payments = getPayments();
    const newPayment: Payment = {
        ...payment,
        id: `pay-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    payments.unshift(newPayment);
    localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));
    return newPayment;
}

export function updatePaymentStatus(id: string, status: PaymentStatus, note?: string) {
    const payments = getPayments();
    const idx = payments.findIndex(p => p.id === id);
    if (idx === -1) return;
    payments[idx] = { ...payments[idx], status, adminNote: note, updatedAt: new Date().toISOString() };
    localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));
}

