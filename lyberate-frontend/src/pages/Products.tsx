import { useState } from 'react';
import { Search, Plus, Edit2, Trash2, RotateCcw, X } from 'lucide-react';

export const Products = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="space-y-6 animate-fade-in pb-safe">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
                    <p className="text-sm text-ios-subtext mt-1">Gestión del catálogo de productos y monedas</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-ios-blue text-white rounded-xl text-sm font-semibold shadow-md hover:bg-blue-600 transition-all"
                >
                    <Plus size={16} /> Nuevo Producto
                </button>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-ios-bg dark:bg-black w-full max-w-md rounded-[2rem] p-6 relative shadow-2xl overflow-hidden glass-panel border border-white/20">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 text-ios-subtext hover:text-ios-text z-10 bg-black/5 dark:bg-white/5 rounded-full">
                            <X size={20} />
                        </button>
                        <h2 className="text-lg font-bold mb-4">Detalles del Producto</h2>
                        <form className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Nombre del Producto</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue focus:bg-white dark:focus:bg-black outline-none transition-all"
                                    placeholder="Ej. Lotería, Parley..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Moneda</label>
                                <select className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue focus:bg-white dark:focus:bg-black outline-none transition-all appearance-none cursor-pointer">
                                    <option value="USD">USD ($)</option>
                                    <option value="VES">Bolívares (Bs)</option>
                                    <option value="COP">Pesos (COP)</option>
                                </select>
                            </div>

                            <div className="pt-4 flex flex-wrap gap-2 justify-center border-t border-black/5 dark:border-white/5">
                                <button type="button" className="flex-1 min-w-[80px] flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl bg-yellow-400/20 text-yellow-700 dark:text-yellow-400 font-bold hover:bg-yellow-400/30 transition-all text-[10px] uppercase tracking-wider">
                                    <RotateCcw size={16} /> Limpiar
                                </button>
                                <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ios-blue text-white font-bold hover:bg-blue-600 active:scale-95 transition-all shadow-md mt-2 text-sm">
                                    <Plus size={18} /> Registrar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tabla/Buscador */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col">
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-subtext" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar productos..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 focus:ring-ios-blue/50 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto rounded-xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                            <tr className="border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider">ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider">Moneda</th>
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5 text-sm">
                            <tr className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group cursor-pointer">
                                <td className="px-6 py-4 font-mono text-ios-subtext">PRD-01</td>
                                <td className="px-6 py-4 font-semibold">Parley</td>
                                <td className="px-6 py-4"><span className="px-2 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 font-bold text-xs">USD</span></td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1.5 text-ios-blue hover:bg-ios-blue/10 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                        <button className="p-1.5 text-ios-red hover:bg-ios-red/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                            <tr className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group cursor-pointer">
                                <td className="px-6 py-4 font-mono text-ios-subtext">PRD-02</td>
                                <td className="px-6 py-4 font-semibold">Animalitos</td>
                                <td className="px-6 py-4"><span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs">VES</span></td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1.5 text-ios-blue hover:bg-ios-blue/10 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                        <button className="p-1.5 text-ios-red hover:bg-ios-red/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
