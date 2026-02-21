import { useState } from 'react';
import { Search, Edit2, Trash2, RotateCcw, X, Plus } from 'lucide-react';

export const Agencies = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="space-y-6 animate-fade-in pb-safe">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Agencias</h1>
                    <p className="text-sm text-ios-subtext mt-1">Directorio de sucursales y puntos de venta</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold shadow-md hover:opacity-80 transition-all"
                >
                    <Plus size={16} /> Nueva Agencia
                </button>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-ios-bg dark:bg-black w-full max-w-lg rounded-[2rem] p-6 relative shadow-2xl overflow-hidden glass-panel border border-white/20">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 text-ios-subtext hover:text-ios-text z-10 bg-black/5 dark:bg-white/5 rounded-full">
                            <X size={20} />
                        </button>
                        <h2 className="text-lg font-bold mb-4">Datos de la Agencia</h2>
                        <form className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Nombre de la Agencia</label>
                                <input type="text" className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Dirección de la Agencia</label>
                                <input type="text" className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Teléfono</label>
                                    <input type="text" className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Email</label>
                                    <input type="email" className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all" />
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Vendedor Asignado</label>
                                    <select className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black border border-transparent focus:border-ios-blue outline-none transition-all appearance-none cursor-pointer">
                                        <option value="">Seleccione un vendedor...</option>
                                        <option value="1">Jhon Doe</option>
                                        <option value="2">Jane Smith</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Teléfono del Vendedor</label>
                                    <input type="text" disabled value="0414-1234567" className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent text-ios-subtext font-medium cursor-not-allowed" />
                                </div>
                            </div>

                            <div className="pt-4 flex flex-wrap gap-2 justify-center border-t border-black/5 dark:border-white/5">
                                <button type="button" className="flex-1 min-w-[80px] flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl bg-yellow-400/20 text-yellow-700 dark:text-yellow-400 font-bold hover:bg-yellow-400/30 transition-all text-[10px] uppercase tracking-wider">
                                    <RotateCcw size={16} /> Limpiar
                                </button>
                                <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold hover:opacity-80 active:scale-95 transition-all shadow-md mt-2 text-sm">
                                    Registrar Agencia
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
                            placeholder="Buscar agencias..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 focus:ring-ios-blue/50 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto rounded-xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                            <tr className="border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider">Agencia</th>
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider">Contacto</th>
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider">Vendedor</th>
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5 text-sm">
                            <tr className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group cursor-pointer">
                                <td className="px-6 py-4">
                                    <p className="font-bold">Agencia Centro</p>
                                    <p className="text-xs text-ios-subtext truncate max-w-[250px]">Av. Principal, Edificio A</p>
                                </td>
                                <td className="px-6 py-4 font-mono text-ios-subtext">0212-9998877</td>
                                <td className="px-6 py-4 font-semibold">Jhon Doe</td>
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
