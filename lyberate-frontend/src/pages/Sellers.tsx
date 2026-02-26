import { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, X, Plus, Globe } from 'lucide-react';
import { getSellers, addSeller, addUser, Seller, Product, getAvailableCurrencies, getGlobalProducts } from '../services/localStore';

export const Sellers = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        idNumber: '',
        phone: '',
        email: '',
        password: '',
    });

    // Temporary storage for currencies being added in the modal
    interface CurrencyGroup {
        id: string;
        name: string; // 'DOLAR', 'PESO COLOMBIANA', 'BOLIVARES VENEZOLANOS'
        products: {
            id: string;
            name: string;
            commissionPct: number;
            partPct: number;
        }[];
    }
    const [currenciesData, setCurrenciesData] = useState<CurrencyGroup[]>([]);
    const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
    const [globalProducts, setGlobalProducts] = useState<string[]>([]);

    useEffect(() => {
        setSellers(getSellers());
        setAvailableCurrencies(getAvailableCurrencies());
        setGlobalProducts(getGlobalProducts());
    }, []);

    const handleAddCurrencyGroup = (currencyName: string) => {
        if (!currencyName) return;
        if (currenciesData.some(c => c.name === currencyName)) return; // prevent duplicates

        const newGroup: CurrencyGroup = {
            id: `temp-c-${Date.now()}`,
            name: currencyName,
            products: []
        };
        setCurrenciesData([...currenciesData, newGroup]);
    };

    const handleRemoveCurrencyGroup = (groupId: string) => {
        setCurrenciesData(prev => prev.filter(c => c.id !== groupId));
    };

    const handleAddProductToCurrency = (groupId: string, productName: string) => {
        setCurrenciesData(prev => prev.map(c => {
            if (c.id !== groupId) return c;
            if (c.products.some(p => p.name === productName)) return c;

            const newProd = {
                id: `temp-p-${Date.now()}-${Math.random()}`,
                name: productName,
                commissionPct: 10,
                partPct: 20
            };
            return { ...c, products: [...c.products, newProd] };
        }));
    };

    const handleRemoveProductFromCurrency = (groupId: string, productId: string) => {
        setCurrenciesData(prev => prev.map(c => {
            if (c.id !== groupId) return c;
            return {
                ...c,
                products: c.products.filter(p => p.id !== productId)
            };
        }));
    };

    const handleUpdateProductPercent = (groupId: string, productId: string, field: 'commissionPct' | 'partPct', value: number) => {
        setCurrenciesData(prev => prev.map(c => {
            if (c.id !== groupId) return c;
            return {
                ...c,
                products: c.products.map(p => {
                    if (p.id !== productId) return p;
                    return { ...p, [field]: value };
                })
            };
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email || !formData.password || !formData.name) return;

        // Map Currency -> Product back to the internal Agency -> Product -> Currency expected by localStore
        // We will create exactly one "agencia principal" per vendor to store all these products

        const productsMap = new Map<string, Product>();

        // Reconstruct products
        currenciesData.forEach(currencyGroup => {
            currencyGroup.products.forEach(prod => {
                const existingProduct = productsMap.get(prod.name) || {
                    id: `p-${Date.now()}-${Math.random()}`,
                    name: prod.name,
                    currencies: []
                };

                existingProduct.currencies.push({
                    id: `c-${Date.now()}-${Math.random()}`,
                    name: currencyGroup.name,
                    commissionPct: prod.commissionPct,
                    partPct: prod.partPct
                });

                productsMap.set(prod.name, existingProduct);
            });
        });

        // 1. Create Seller Object
        const newSeller = addSeller({
            name: formData.name,
            idNumber: formData.idNumber,
            phone: formData.phone,
            products: Array.from(productsMap.values()),
        });

        // 2. Create User Account
        addUser({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: 'Vendedor',
            sellerId: newSeller.id
        });

        // Refresh and close
        setSellers(getSellers());
        setIsModalOpen(false);
        setCurrenciesData([]);
        setFormData({ name: '', idNumber: '', phone: '', email: '', password: '' });
    };

    const filteredSellers = sellers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.idNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in pb-safe">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Vendedores</h1>
                    <p className="text-sm text-ios-subtext mt-1">Configura comisiones por moneda y producto</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-ios-blue text-white rounded-xl text-sm font-semibold shadow-md hover:bg-blue-600 transition-all"
                >
                    <Plus size={16} /> Nuevo Vendedor
                </button>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-ios-bg dark:bg-[#1c1c1e] w-full max-w-2xl rounded-[2rem] p-6 relative shadow-2xl overflow-hidden border border-white/20 max-h-[90vh] overflow-y-auto no-scrollbar">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 text-ios-subtext hover:text-ios-text z-10 bg-black/5 dark:bg-white/5 rounded-full">
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-bold mb-6">Registro de Nuevo Vendedor</h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Section 1: User Info */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-ios-blue uppercase tracking-widest">Información de Acceso y Perfil</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Nombre Completo</label>
                                        <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all" placeholder="Ej: Jhon Doe" />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Correo Electrónico</label>
                                        <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all" placeholder="vendedor@email.com" />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Contraseña Portal</label>
                                        <input required type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all" placeholder="••••••••" />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Documento / ID</label>
                                        <input type="text" value={formData.idNumber} onChange={e => setFormData({ ...formData, idNumber: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all" placeholder="V-12345678" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Structure -> Currencies then Products */}
                            <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/5">
                                <h3 className="text-xs font-bold text-ios-blue uppercase tracking-widest">Estructura de Venta (Monedas y Productos)</h3>

                                <div className="flex flex-col sm:flex-row gap-2 items-center">
                                    <select
                                        className="flex-1 w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent text-sm outline-none focus:border-ios-blue"
                                        onChange={(e) => {
                                            if (e.target.value) handleAddCurrencyGroup(e.target.value);
                                            e.target.value = '';
                                        }}
                                    >
                                        <option value="">+ Seleccionar Moneda</option>
                                        {availableCurrencies.filter(c => !currenciesData.some(cd => cd.name === c)).map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    {currenciesData.map(group => (
                                        <div key={group.id} className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 space-y-4">
                                            <div className="flex justify-between items-center pb-2 border-b border-black/5 dark:border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <Globe size={16} className={
                                                        group.name === 'DOLAR' ? 'text-green-500' :
                                                            group.name === 'PESO COLOMBIANA' ? 'text-yellow-500' : 'text-blue-500'
                                                    } />
                                                    <span className="font-bold text-sm tracking-tight">{group.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        className="text-xs bg-ios-blue text-white font-bold rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                                                        onChange={(e) => {
                                                            if (e.target.value) handleAddProductToCurrency(group.id, e.target.value);
                                                            e.target.value = '';
                                                        }}
                                                    >
                                                        <option value="">+ Producto</option>
                                                        {globalProducts.filter(p => !group.products.some(gp => gp.name === p)).map(p => (
                                                            <option key={p} value={p}>{p}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveCurrencyGroup(group.id)}
                                                        className="p-1.5 text-ios-red hover:bg-ios-red/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                {group.products.length === 0 ? (
                                                    <p className="text-xs text-ios-subtext italic">Seleccione un producto para configurar comisiones.</p>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {group.products.map(prod => (
                                                            <div key={prod.id} className="bg-white/60 dark:bg-black/40 p-3 rounded-xl space-y-3 relative group/prod border border-black/5 dark:border-white/5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveProductFromCurrency(group.id, prod.id)}
                                                                    className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover/prod:opacity-100 transition-opacity shadow-sm z-10"
                                                                >
                                                                    <Trash2 size={10} />
                                                                </button>
                                                                <div className="font-bold text-xs text-ios-text tracking-widest">{prod.name}</div>
                                                                <div className="flex gap-3">
                                                                    <div className="flex-1 space-y-1">
                                                                        <label className="block text-[9px] text-ios-subtext uppercase font-bold">Comisión %</label>
                                                                        <div className="relative">
                                                                            <input
                                                                                type="number"
                                                                                step="0.1"
                                                                                value={prod.commissionPct}
                                                                                onChange={e => handleUpdateProductPercent(group.id, prod.id, 'commissionPct', Number(e.target.value))}
                                                                                className="w-full bg-black/5 dark:bg-white/5 rounded-lg text-xs py-1.5 px-2 outline-none focus:ring-1 focus:ring-ios-blue transition-all"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1 space-y-1">
                                                                        <label className="block text-[9px] text-ios-subtext uppercase font-bold">Participación %</label>
                                                                        <div className="relative">
                                                                            <input
                                                                                type="number"
                                                                                step="0.1"
                                                                                value={prod.partPct}
                                                                                onChange={e => handleUpdateProductPercent(group.id, prod.id, 'partPct', Number(e.target.value))}
                                                                                className="w-full bg-black/5 dark:bg-white/5 rounded-lg text-xs py-1.5 px-2 outline-none focus:ring-1 focus:ring-ios-blue transition-all"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 rounded-xl bg-black/5 dark:bg-white/5 font-bold hover:bg-black/10 transition-all text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-3 rounded-xl bg-ios-blue text-white font-bold hover:bg-blue-600 active:scale-95 transition-all shadow-lg text-sm"
                                >
                                    Guardar Perfil Completo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col">
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-subtext" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar vendedores..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 focus:ring-ios-blue/50 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto rounded-xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50 min-h-[300px]">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider">Vendedor</th>
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider">Productos Asignados</th>
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider">Monedas Operativas</th>
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5 text-sm">
                            {filteredSellers.map(seller => {
                                // Extract products and unique currencies
                                const products = seller.products || [];
                                const uniqueCurrencies = Array.from(new Set(products.flatMap(p => p.currencies.map(c => c.name))));

                                return (
                                    <tr key={seller.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="font-bold">{seller.name}</p>
                                            <p className="text-[10px] text-ios-subtext">{seller.idNumber} · {seller.phone}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {products.length === 0 ? (
                                                    <span className="text-xs text-ios-subtext italic">Sin productos</span>
                                                ) : (
                                                    products.map(p => (
                                                        <span key={p.id} className="text-xs font-medium bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-lg w-fit">
                                                            {p.name}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {uniqueCurrencies.map(currencyName => (
                                                    <span key={currencyName} className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${currencyName === 'DOLAR' ? 'bg-green-500/10 text-green-600 dark:text-green-500' :
                                                        currencyName === 'PESO COLOMBIANA' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500' :
                                                            'bg-blue-500/10 text-blue-600 dark:text-blue-500'
                                                        }`}>
                                                        {currencyName}
                                                    </span>
                                                ))}
                                                {uniqueCurrencies.length === 0 && (
                                                    <span className="text-[10px] text-ios-subtext">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 text-ios-blue hover:bg-ios-blue/10 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                                <button className="p-1.5 text-ios-red hover:bg-ios-red/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
