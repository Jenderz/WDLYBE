import { Eye, FileText } from 'lucide-react';
import { Payment } from '../../../services/apiService';

interface Props {
    filteredPayments: Payment[];
    onOpenProof: (src: string) => void;
    onSelectTicket: (payment: Payment) => void;
}

export const PaymentsTable = ({ filteredPayments, onOpenProof, onSelectTicket }: Props) => {
    return (
        <div className="glass-panel rounded-2xl overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-ios-subtext">ID RECIBO</th>
                            <th className="px-6 py-4 font-semibold text-ios-subtext">VENDEDOR</th>
                            <th className="px-6 py-4 font-semibold text-ios-subtext">TIPO</th>
                            <th className="px-6 py-4 font-semibold text-ios-subtext">MONTO</th>
                            <th className="px-6 py-4 font-semibold text-ios-subtext font-bold text-center">ESTADO</th>
                            <th className="px-6 py-4 font-semibold text-ios-subtext">FECHA</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {filteredPayments.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-ios-subtext italic">No hay pagos registrados en este período.</td>
                            </tr>
                        ) : (
                            filteredPayments.map((row) => {
                                const isCredit = row.type === 'credit';
                                return (
                                    <tr key={row.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group">
                                        <td className="px-6 py-4 font-medium font-mono text-xs text-ios-subtext">{row.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold">{row.vendorName}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {isCredit ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                    💳 Crédito
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-ios-green/10 text-ios-green border border-ios-green/20">
                                                    💰 Pago
                                                </span>
                                            )}
                                        </td>
                                        <td className={`px-6 py-4 font-bold ${isCredit ? 'text-amber-500' : 'text-ios-green'}`}>
                                            {row.amount.toFixed(2)} <span className="text-[10px] text-ios-subtext uppercase ml-1 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md">{row.currency}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${row.status === 'approved'
                                                ? 'bg-ios-green/10 text-ios-green'
                                                : row.status === 'rejected' ? 'bg-ios-red/10 text-ios-red' : 'bg-orange-500/10 text-orange-500'
                                                }`}>
                                                {row.status === 'approved' ? 'Aprobado' : row.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-ios-subtext">{row.date}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {row.proofImageUrl && (
                                                    <button
                                                        onClick={() => onOpenProof(row.proofImageUrl!)}
                                                        className="text-ios-blue hover:text-blue-600 hover:bg-blue-500/10 p-1.5 rounded-lg transition-all"
                                                        title="Ver Comprobante"
                                                    >
                                                        <Eye size={17} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onSelectTicket(row)}
                                                    className="text-ios-subtext hover:text-ios-blue hover:bg-blue-500/10 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title="Generar Ticket"
                                                >
                                                    <FileText size={17} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
