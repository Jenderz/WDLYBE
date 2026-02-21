import { useState } from 'react';
import { Search, Plus, Calendar, RotateCcw, FileSearch, X, Edit2, Trash2 } from 'lucide-react';

export const Expenses = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="space-y-6 animate-fade-in pb-safe">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gastos</h1>
                    <p className="text-sm text-ios-subtext mt-1">Control de egresos diarios y gastos fijos</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-ios-red text-white rounded-xl text-sm font-semibold shadow-md hover:bg-red-600 transition-all"
                >
                    <Plus size={16} /> Nuevo Gasto
                </button>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-ios-bg dark:bg-black w-full max-w-lg rounded-[2rem] p-6 relative shadow-2xl overflow-hidden glass-panel border border-white/20 border-t-4 border-t-ios-red">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 text-ios-subtext hover:text-ios-text z-10 bg-black/5 dark:bg-white/5 rounded-full">
                            <X size={20} />
                        </button>
                        <h2 className="text-lg font-bold mb-4">Ingresar Gasto</h2>
                        <form className="space-y-4">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Fecha</label>
                                    <input type="date" className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-red outline-none transition-all" />
                                </div>
                                <div className="flex items-end pb-1 text-xs text-ios-subtext cursor-pointer hover:text-ios-blue transition-colors">
                                    <Calendar size={20} className="mr-1" /> Hoy
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Tipo de Gasto</label>
                                <select className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-red outline-none transition-all appearance-none cursor-pointer">
                                    <option value="">Selecciona un tipo...</option>
                                    <option value="Operativo">Operativo</option>
                                    <option value="Nomina">Nómina</option>
                                    <option value="Servicios">Servicios Básicos</option>
                                    <option value="Otros">Otros</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Concepto de Gasto</label>
                                <input type="text" placeholder="Ej. Pago de Internet" className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-red outline-none transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Método</label>
                                    <select className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-red outline-none appearance-none cursor-pointer">
                                        <option>Transferencia</option>
                                        <option>Efectivo</option>
                                        <option>Zelle</option>
                                        <option>Pago Móvil</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Banco</label>
                                    <select className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-red outline-none appearance-none cursor-pointer">
                                        <option>Banesco</option>
                                        <option>Provincial</option>
                                        <option>Bank of America</option>
                                        <option>N/A</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-ios-red/10 border border-ios-red/20">
                                <label className="block text-xs font-bold text-ios-red mb-1 uppercase tracking-wider">Total en USD ($)</label>
                                <input type="number" step="0.01" placeholder="0.00" className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black text-2xl font-black text-ios-red border-none focus:ring-2 focus:ring-ios-red/50 outline-none transition-all" />
                            </div>

                            <div className="pt-4 flex flex-wrap gap-2 justify-center border-t border-black/5 dark:border-white/5">
                                <button type="button" className="flex-1 min-w-[80px] flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl bg-yellow-400/20 text-yellow-700 dark:text-yellow-400 font-bold hover:bg-yellow-400/30 transition-all text-[10px] uppercase tracking-wider">
                                    <RotateCcw size={16} /> Limpiar
                                </button>
                                <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ios-red text-white font-bold hover:bg-red-600 transition-all shadow-md mt-2 text-sm">
                                    <Plus size={16} /> Registrar Gasto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Historial Corto */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col">
                <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
                    <div className="relative flex-1 w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-subtext" size={20} />
                        <input type="text" placeholder="Buscar gastos..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 focus:ring-ios-red/50 outline-none transition-all" />
                    </div>

                    <button type="button" className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400/20 text-yellow-700 dark:text-yellow-400 font-bold hover:bg-yellow-400/30 transition-all text-xs uppercase tracking-wider">
                        <FileSearch size={16} /> Auditar
                    </button>
                </div>

                <div className="flex-1 overflow-x-auto rounded-xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider">Concepto</th>
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider">Tipo/Método</th>
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider text-right">Monto</th>
                                <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5 text-sm">
                            <tr className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group cursor-pointer">
                                <td className="px-6 py-4 text-ios-subtext font-mono">2026-02-20</td>
                                <td className="px-6 py-4 font-semibold uppercase text-xs tracking-wide">Pago de Internet</td>
                                <td className="px-6 py-4"><span className="text-xs text-ios-subtext">Servicios / Zelle</span></td>
                                <td className="px-6 py-4 text-right font-bold text-ios-red">$-50.00</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1.5 text-ios-blue hover:bg-ios-blue/10 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                        <button className="p-1.5 text-ios-red hover:bg-ios-red/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                            <tr className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group cursor-pointer">
                                <td className="px-6 py-4 text-ios-subtext font-mono">2026-02-18</td>
                                <td className="px-6 py-4 font-semibold uppercase text-xs tracking-wide">Mantenimiento AC</td>
                                <td className="px-6 py-4"><span className="text-xs text-ios-subtext">Operativo / Efectivo</span></td>
                                <td className="px-6 py-4 text-right font-bold text-ios-red">$-20.00</td>
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
