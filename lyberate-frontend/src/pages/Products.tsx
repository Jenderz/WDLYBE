import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, X, Package, DollarSign } from 'lucide-react';
import {
    getGlobalProducts, addGlobalProduct, deleteGlobalProduct,
    getAvailableCurrencies, addAvailableCurrency, deleteAvailableCurrency
} from '../services/localStore';

export const Products = () => {
    const [products, setProducts] = useState<string[]>([]);
    const [currencies, setCurrencies] = useState<string[]>([]);

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);

    const [newItemName, setNewItemName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setProducts(getGlobalProducts());
        setCurrencies(getAvailableCurrencies());
    }, []);

    const handleAddProduct = (e: React.FormEvent) => {
        e.preventDefault();
        if (addGlobalProduct(newItemName)) {
            setProducts(getGlobalProducts());
            setNewItemName('');
            setIsProductModalOpen(false);
        }
    };

    const handleAddCurrency = (e: React.FormEvent) => {
        e.preventDefault();
        if (addAvailableCurrency(newItemName)) {
            setCurrencies(getAvailableCurrencies());
            setNewItemName('');
            setIsCurrencyModalOpen(false);
        }
    };

    const handleDeleteProduct = (name: string) => {
        if (confirm(`¿Eliminar producto ${name}?`)) {
            deleteGlobalProduct(name);
            setProducts(getGlobalProducts());
        }
    };

    const handleDeleteCurrency = (name: string) => {
        if (confirm(`¿Eliminar moneda ${name}?`)) {
            deleteAvailableCurrency(name);
            setCurrencies(getAvailableCurrencies());
        }
    };

    const filteredProducts = products.filter(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredCurrencies = currencies.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6 animate-fade-in pb-safe">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Catálogo Central</h1>
                    <p className="text-sm text-ios-subtext mt-1">Gestión universal de productos y monedas disponibles en el sistema.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsCurrencyModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl text-sm font-semibold hover:bg-green-500/20 transition-all"
                    >
                        <Plus size={16} /> Moneda
                    </button>
                    <button
                        onClick={() => setIsProductModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-ios-blue text-white rounded-xl text-sm font-semibold shadow-md hover:bg-blue-600 transition-all"
                    >
                        <Plus size={16} /> Producto
                    </button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-subtext" size={20} />
                <input
                    type="text"
                    placeholder="Buscar en el catálogo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 focus:ring-ios-blue/50 outline-none transition-all"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Productos */}
                <div className="glass-panel p-6 rounded-3xl flex flex-col">
                    <div className="flex items-center gap-2 mb-4 text-ios-blue font-bold">
                        <Package size={20} />
                        <h2>Productos Globales</h2>
                    </div>
                    <div className="space-y-2">
                        {filteredProducts.map(p => (
                            <div key={p} className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 group">
                                <span className="font-semibold">{p}</span>
                                <button onClick={() => handleDeleteProduct(p)} className="p-1.5 text-ios-red hover:bg-ios-red/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {filteredProducts.length === 0 && <p className="text-ios-subtext text-xs italic">No hay productos...</p>}
                    </div>
                </div>

                {/* Monedas */}
                <div className="glass-panel p-6 rounded-3xl flex flex-col">
                    <div className="flex items-center gap-2 mb-4 text-green-600 dark:text-green-400 font-bold">
                        <DollarSign size={20} />
                        <h2>Monedas Disponibles</h2>
                    </div>
                    <div className="space-y-2">
                        {filteredCurrencies.map(c => (
                            <div key={c} className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 group">
                                <span className="font-semibold">{c}</span>
                                <button onClick={() => handleDeleteCurrency(c)} className="p-1.5 text-ios-red hover:bg-ios-red/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {filteredCurrencies.length === 0 && <p className="text-ios-subtext text-xs italic">No hay monedas...</p>}
                    </div>
                </div>
            </div>

            {/* Modal Producto */}
            {isProductModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-ios-bg dark:bg-black w-full max-w-sm rounded-[2rem] p-6 relative shadow-2xl glass-panel">
                        <button onClick={() => setIsProductModalOpen(false)} className="absolute top-4 right-4 p-2 text-ios-subtext hover:text-black dark:hover:text-white rounded-full"><X size={20} /></button>
                        <h2 className="text-lg font-bold mb-4">Nuevo Producto</h2>
                        <form onSubmit={handleAddProduct} className="space-y-4">
                            <input
                                autoFocus
                                type="text"
                                required
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value.toUpperCase())}
                                placeholder="Ej. Lotería, Parley..."
                                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none"
                            />
                            <button type="submit" className="w-full py-3 rounded-xl bg-ios-blue text-white font-bold hover:bg-blue-600 transition-all">Registrar Producto</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Moneda */}
            {isCurrencyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-ios-bg dark:bg-black w-full max-w-sm rounded-[2rem] p-6 relative shadow-2xl glass-panel">
                        <button onClick={() => setIsCurrencyModalOpen(false)} className="absolute top-4 right-4 p-2 text-ios-subtext hover:text-black dark:hover:text-white rounded-full"><X size={20} /></button>
                        <h2 className="text-lg font-bold mb-4 text-green-600 dark:text-green-400">Nueva Moneda</h2>
                        <form onSubmit={handleAddCurrency} className="space-y-4">
                            <input
                                autoFocus
                                type="text"
                                required
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value.toUpperCase())}
                                placeholder="Ej. EUROS, PESOS MEXICANOS..."
                                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-green-500 outline-none"
                            />
                            <button type="submit" className="w-full py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-all">Registrar Moneda</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
