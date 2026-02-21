import { Package, Users, Store, Receipt, Wallet, Banknote, LayoutDashboard, Settings } from 'lucide-react';

export const ADMIN_MENU_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'sales', label: 'Ventas', icon: Receipt, path: '/sales' },
    { id: 'collections', label: 'Recaudaciones', icon: Wallet, path: '/collections' },
    { id: 'expenses', label: 'Gastos', icon: Banknote, path: '/expenses' },
    { id: 'separator', isSeparator: true },
    { id: 'products', label: 'Productos', icon: Package, path: '/products' },
    { id: 'sellers', label: 'Vendedores', icon: Users, path: '/sellers' },
    { id: 'agencies', label: 'Agencias', icon: Store, path: '/agencies' },
    { id: 'separator', isSeparator: true },
    { id: 'settings', label: 'Configuración', icon: Settings, path: '/settings' },
];
