import { useMemo } from 'react';
import { Payment, Sale } from '../../../services/apiService';
import { FilterPreset } from '../hooks/useCollectionsFilter';

interface Props {
    sales: Sale[];
    payments: Payment[];
    filterRange: { start: Date; end: Date } | null;
    filterPreset: FilterPreset;
    rangeStart: string;
    rangeEnd: string;
}

export const SellerBalanceTable = ({ sales, payments, filterRange, filterPreset, rangeStart, rangeEnd }: Props) => {
    const rangeLabel = filterPreset === 'today' ? 'Hoy' :
        filterPreset === 'week' ? 'Esta semana' :
            filterPreset === 'month' ? 'Este mes' :
                filterPreset === 'range' && rangeStart && rangeEnd ? `${rangeStart} al ${rangeEnd}` :
                    'Todos los registros';

    const rows = useMemo(() => {
        const start = filterRange?.start;
        const end = filterRange?.end;

        const balanceMap = new Map<string, {
            sellerName: string;
            currency: string;
            totalBank: number;
            totalPaid: number;
            balance: number;
        }>();

        sales.filter(s => {
            const d = new Date(s.date + 'T12:00:00');
            if (!start || !end) return true;
            return d >= start && d <= end;
        }).forEach(s => {
            const key = `${s.sellerId}__${s.currencyName}`;
            if (!balanceMap.has(key)) {
                balanceMap.set(key, { sellerName: s.sellerName, currency: s.currencyName, totalBank: 0, totalPaid: 0, balance: 0 });
            }
            balanceMap.get(key)!.totalBank += s.totalBank;
        });

        payments.filter(p => {
            const d = new Date(p.date + 'T12:00:00');
            if (!start || !end) return p.status === 'approved';
            return d >= start && d <= end && p.status === 'approved';
        }).forEach(p => {
            for (const [key, val] of balanceMap.entries()) {
                if (key.startsWith(p.sellerId + '__') && val.currency === p.currency) {
                    if (p.type === 'credit') {
                        val.totalBank = Math.max(0, val.totalBank - p.amount);
                    } else {
                        val.totalPaid += p.amount;
                    }
                }
            }
        });

        balanceMap.forEach(val => { val.balance = val.totalBank - val.totalPaid; });

        return Array.from(balanceMap.values()).sort((a, b) => a.sellerName.localeCompare(b.sellerName));
    }, [sales, payments, filterRange]);

    if (rows.length === 0) return null;

    return (
        <div className="glass-panel rounded-2xl overflow-hidden animate-fade-in">
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                <h3 className="font-bold text-sm tracking-wide">🧾 Balance por Vendedor</h3>
                <span className="text-xs text-ios-subtext">{rangeLabel}</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-black/5 dark:bg-white/5 text-ios-subtext text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-5 py-3 text-left font-semibold">Vendedor</th>
                            <th className="px-5 py-3 text-right font-semibold">Moneda</th>
                            <th className="px-5 py-3 text-right font-semibold">Deuda Total</th>
                            <th className="px-5 py-3 text-right font-semibold">Pagado</th>
                            <th className="px-5 py-3 text-right font-semibold">Balance</th>
                            <th className="px-5 py-3 text-center font-semibold">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {rows.map((row, i) => (
                            <tr key={i} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                <td className="px-5 py-3 font-semibold">{row.sellerName}</td>
                                <td className="px-5 py-3 text-right text-ios-subtext font-mono text-xs">{row.currency}</td>
                                <td className="px-5 py-3 text-right font-bold">{row.totalBank.toFixed(2)}</td>
                                <td className="px-5 py-3 text-right text-ios-green font-bold">{row.totalPaid.toFixed(2)}</td>
                                <td className={`px-5 py-3 text-right font-black text-base ${row.balance > 0 ? 'text-red-500' : row.balance < 0 ? 'text-green-500' : 'text-ios-subtext'}`}>
                                    {row.balance > 0 ? '+' : ''}{row.balance.toFixed(2)}
                                </td>
                                <td className="px-5 py-3 text-center">
                                    {row.balance > 0.01 ? (
                                        <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 whitespace-nowrap">
                                            🔴 Nos debe
                                        </span>
                                    ) : row.balance < -0.01 ? (
                                        <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 whitespace-nowrap">
                                            🟢 Le debemos
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-black/5 dark:bg-white/5 text-ios-subtext border border-black/5 dark:border-white/5">
                                            ✅ Al día
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
