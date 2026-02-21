import { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, X, Plus, Globe } from 'lucide-react';
import { getSellers, addSeller, addUser, Seller, Agency, Product, CurrencyConfig } from '../services/localStore';

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

    // Temporary storage for agencies being added in the modal
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [currentAgencyName, setCurrentAgencyName] = useState('');

    useEffect(() => {
        setSellers(getSellers());
    }, []);

    const handleAddAgency = () => {
        if (!currentAgencyName) return;
        const newAgency: Agency = {
            id: `temp-a-${Date.now()}`,
            name: currentAgencyName,
            products: [] // Start with empty products
        };
        setAgencies([...agencies, newAgency]);
        setCurrentAgencyName('');
    };

    const handleAddProductToAgency = (agencyId: string, productName: string) => {
        setAgencies(prev => prev.map(a => {
            if (a.id !== agencyId) return a;
            // Add product with no default currencies; user will add them
            const newProd: Product = {
                id: `temp-p-${Date.now()}`,
                name: productName,
                currencies: []
            };
            return { ...a, products: [...a.products, newProd] };
        }));
    };

    const handleAddCurrencyToProduct = (agencyId: string, productId: string, currencyName: string) => {
        setAgencies(prev => prev.map(a => {
            if (a.id !== agencyId) return a;
            return {
                ...a,
                products: a.products.map(p => {
                    if (p.id !== productId) return p;
                    if (p.currencies.some(c => c.name === currencyName)) return p; // avoid duplicates
                    const newCurr: CurrencyConfig = {
                        id: `c-${Date.now()}-${Math.random()}`,
                        name: currencyName,
                        commissionPct: 10,
                        partPct: 20
                    };
                    return { ...p, currencies: [...p.currencies, newCurr] };
                })
            };
        }));
    };

    const handleRemoveCurrencyFromProduct = (agencyId: string, productId: string, currencyId: string) => {
        setAgencies(prev => prev.map(a => {
            if (a.id !== agencyId) return a;
            return {
                ...a,
                products: a.products.map(p => {
                    if (p.id !== productId) return p;
                    return {
                        ...p,
                        currencies: p.currencies.filter(c => c.id !== currencyId)
                    };
                })
            };
        }));
    };

    const handleUpdateCommission = (agencyId: string, productId: string, currencyId: string, field: 'commissionPct' | 'partPct', value: number) => {
        setAgencies(prev => prev.map(a => {
            if (a.id !== agencyId) return a;
            return {
                ...a,
                products: a.products.map(p => {
                    if (p.id !== productId) return p;
                    return {
                        ...p,
                        currencies: p.currencies.map(c => {
                            if (c.id !== currencyId) return c;
                            return { ...c, [field]: value };
                        })
                    };
                })
            };
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email || !formData.password || !formData.name) return;

        // 1. Create Seller Object
        const newSeller = addSeller({
            name: formData.name,
            idNumber: formData.idNumber,
            phone: formData.phone,
            agencies: agencies.map(a => ({ ...a, id: `a-${Date.now()}-${Math.random()}` })), // generate final IDs
        });

        // 2. Create User Account
        addUser({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: 'Vendedor',
            sellerId: newSeller.id,
            agencyName: agencies[0]?.name || 'Agencia Principal'
        });

        // Refresh and close
        setSellers(getSellers());
        setIsModalOpen(false);
        setAgencies([]);
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
                    <p className="text-sm text-ios-subtext mt-1">Configura jerarquía de agencias y comisiones</p>
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

                            {/* Section 2: Agencies and Products */}
                            <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/5">
                                <h3 className="text-xs font-bold text-ios-blue uppercase tracking-widest">Estructura de Venta (Agencias y Productos)</h3>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={currentAgencyName}
                                        onChange={e => setCurrentAgencyName(e.target.value)}
                                        className="flex-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent text-sm"
                                        placeholder="Nombre de la Agencia (ej: Sede Norte)"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddAgency}
                                        className="px-4 py-2 bg-ios-blue text-white rounded-xl text-xs font-bold hover:bg-blue-600"
                                    >
                                        + Agregar Agencia
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {agencies.map(agency => (
                                        <div key={agency.id} className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <Globe size={14} className="text-ios-blue" />
                                                    <span className="font-bold text-sm">{agency.name}</span>
                                                </div>
                                                <select
                                                    className="text-xs bg-white dark:bg-black/40 rounded-lg px-2 py-1 outline-none border border-black/10 dark:border-white/10"
                                                    onChange={(e) => {
                                                        if (e.target.value) handleAddProductToAgency(agency.id, e.target.value);
                                                        e.target.value = '';
                                                    }}
                                                >
                                                    <option value="">+ Añadir Producto</option>
                                                    <option value="PARLEY BETM3">PARLEY BETM3</option>
                                                    <option value="ANIMALITOS">ANIMALITOS</option>
                                                    <option value="LOTERIAS">LOTERIAS</option>
                                                </select>
                                            </div>

                                            {agency.products.map(prod => (
                                                <div key={prod.id} className="ml-4 pl-4 border-l-2 border-ios-blue/30 space-y-3 py-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-ios-blue uppercase tracking-widest">{prod.name}</span>
                                                        <select
                                                            className="text-[10px] bg-ios-blue text-white rounded-lg px-2 py-1 outline-none font-bold cursor-pointer"
                                                            onChange={(e) => {
                                                                if (e.target.value === 'custom') {
                                                                    const name = prompt('Ingrese el nombre de la divisa (ej: EUR, BRL):');
                                                                    if (name) handleAddCurrencyToProduct(agency.id, prod.id, name);
                                                                    e.target.value = '';
                                                                } else if (e.target.value) {
                                                                    handleAddCurrencyToProduct(agency.id, prod.id, e.target.value);
                                                                    e.target.value = '';
                                                                }
                                                            }}
                                                        >
                                                            <option value="">+ Divisa</option>
                                                            <option value="USD">USD</option>
                                                            <option value="Bolívares">Bolívares</option>
                                                            <option value="Peso COP">Peso COP</option>
                                                            <option value="custom">Otro...</option>
                                                        </select>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {prod.currencies.map(curr => (
                                                            <div key={curr.id} className="bg-white/40 dark:bg-black/20 p-3 rounded-xl space-y-2 relative group/curr">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveCurrencyFromProduct(agency.id, prod.id, curr.id)}
                                                                    className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover/curr:opacity-100 transition-opacity shadow-sm"
                                                                >
                                                                    <Trash2 size={10} />
                                                                </button>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[10px] font-bold text-ios-subtext uppercase tracking-tighter">{curr.name}</span>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <div className="flex-1">
                                                                        <label className="block text-[8px] text-ios-subtext uppercase font-bold">Comisión %</label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.1"
                                                                            value={curr.commissionPct}
                                                                            onChange={e => handleUpdateCommission(agency.id, prod.id, curr.id, 'commissionPct', Number(e.target.value))}
                                                                            className="w-full bg-transparent border-b border-black/10 dark:border-white/10 text-xs py-1 outline-none focus:border-ios-blue transition-colors"
                                                                        />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <label className="block text-[8px] text-ios-subtext uppercase font-bold">Part. %</label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.1"
                                                                            value={curr.partPct}
                                                                            onChange={e => handleUpdateCommission(agency.id, prod.id, curr.id, 'partPct', Number(e.target.value))}
                                                                            className="w-full bg-transparent border-b border-black/10 dark:border-white/10 text-xs py-1 outline-none focus:border-ios-blue transition-colors"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {prod.currencies.length === 0 && (
                                                        <p className="text-[10px] text-ios-subtext italic ml-2">Agregue al menos una divisa para configurar comisiones.</p>
                                                    )}
                                                </div>
                                            ))}
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
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider">Agencias</th>
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider">Configuración</th>
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5 text-sm">
                            {filteredSellers.map(seller => (
                                <tr key={seller.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="font-bold">{seller.name}</p>
                                        <p className="text-[10px] text-ios-subtext">{seller.idNumber} · {seller.phone}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {seller.agencies.map(a => (
                                                <span key={a.id} className="text-xs font-medium bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-lg w-fit">
                                                    {a.name} ({a.products.length} prods)
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {seller.agencies.flatMap(a => a.products).slice(0, 3).map(p => (
                                                <span key={p.id} className="text-[10px] bg-ios-blue/10 text-ios-blue px-1.5 py-0.5 rounded font-bold">
                                                    {p.name.split(' ')[0]}
                                                </span>
                                            ))}
                                            {seller.agencies.flatMap(a => a.products).length > 3 && (
                                                <span className="text-[10px] text-ios-subtext">+{seller.agencies.flatMap(a => a.products).length - 3}</span>
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
