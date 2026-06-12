import { useMemo, useState } from 'react';
import { Payment, Sale } from '../../../services/apiService';
import { FilterPreset } from '../hooks/useCollectionsFilter';
import { useSmartTable } from '../../../hooks/useSmartTable';
import { TablePaginator } from '../../../components/SmartTable/TablePaginator';
import { CurrencyChips } from '../../../components/SmartTable/CurrencyChips';

interface Props {
    sales: Sale[];
    payments: Payment[];
    filterRange: { start: Date; end: Date } | null;
    filterPreset: FilterPreset;
    rangeStart: string;
    rangeEnd: string;
    searchQuery: string;
}

type StatusFilter = 'ALL' | 'debt' | 'credit' | 'settled';

const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const SellerBalanceTable = ({
    sales, payments, filterRange, filterPreset, rangeStart, rangeEnd, searchQuery
}: Props) => {

    const [currencyFilter, setCurrencyFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

    const rangeLabel = filterPreset === 'today' ? 'Hoy' :
        filterPreset === 'week' ? 'Esta semana' :
            filterPreset === 'month' ? 'Este mes' :
                filterPreset === 'range' && rangeStart && rangeEnd
                    ? `${rangeStart} al ${rangeEnd}`
                    : 'Todos los registros';

    // ─── Cálculo principal ────────────────────────────────────────────────────
    const rows = useMemo(() => {
        const start = filterRange?.start;
        const end = filterRange?.end;

        const balanceMap = new Map<string, {
            sellerName: string;
            sellerId: string;
            currency: string;
            totalBank: number;
            totalPaid: number;
            totalCredits: number;
            totalPayouts: number;
            balance: number;
        }>();

        sales.filter(s => {
            const d = new Date(s.date + 'T12:00:00');
            if (!start || !end) return true;
            return d >= start && d <= end;
        }).forEach(s => {
            const key = `${s.sellerId}|||${s.currencyName}`;
            if (!balanceMap.has(key)) {
                balanceMap.set(key, {
                    sellerName: s.sellerName,
                    sellerId: String(s.sellerId),
                    currency: s.currencyName,
                    totalBank: 0, totalPaid: 0,
                    totalCredits: 0, totalPayouts: 0, balance: 0,
                });
            }
            balanceMap.get(key)!.totalBank += s.totalBank;
        });

        payments.filter(p => {
            const d = new Date(p.date + 'T12:00:00');
            if (!start || !end) return p.status === 'approved';
            return d >= start && d <= end && p.status === 'approved';
        }).forEach(p => {
            const key = `${p.sellerId}|||${p.currency}`;
            if (!balanceMap.has(key)) return;
            const val = balanceMap.get(key)!;
            if (p.type === 'credit') val.totalCredits += p.amount;
            else if (p.type === 'payout') val.totalPayouts += p.amount;
            else val.totalPaid += p.amount;
        });

        balanceMap.forEach(val => {
            val.balance = val.totalBank - val.totalPaid - val.totalCredits + val.totalPayouts;
        });

        return Array.from(balanceMap.values()).sort((a, b) => a.sellerName.localeCompare(b.sellerName));
    }, [sales, payments, filterRange]);

    // ─── Monedas disponibles ──────────────────────────────────────────────────
    const availableCurrencies = useMemo(() =>
        Array.from(new Set(rows.map(r => r.currency))).sort()
    , [rows]);

    // ─── Filtrado combinado: nombre + moneda + estado ─────────────────────────
    const filteredRows = useMemo(() => {
        const nameQ = searchQuery.toLowerCase().trim();
        return rows.filter(r => {
            const matchesCurrency = currencyFilter === 'ALL' || r.currency === currencyFilter;
            const matchesName = !nameQ ||
                r.sellerName.toLowerCase().includes(nameQ) ||
                r.currency.toLowerCase().includes(nameQ);
            const matchesStatus =
                statusFilter === 'ALL' ? true :
                statusFilter === 'debt' ? r.balance > 0.01 :
                statusFilter === 'credit' ? r.balance < -0.01 :
                Math.abs(r.balance) <= 0.01;
            return matchesCurrency && matchesName && matchesStatus;
        });
    }, [rows, searchQuery, currencyFilter, statusFilter]);

    // ─── Contadores de estado para los badges ────────────────────────────────
    const counts = useMemo(() => ({
        debt:    rows.filter(r => r.balance > 0.01).length,
        credit:  rows.filter(r => r.balance < -0.01).length,
        settled: rows.filter(r => Math.abs(r.balance) <= 0.01).length,
    }), [rows]);

    // ─── Paginación ───────────────────────────────────────────────────────────
    const {
        paginatedData,
        page, setPage,
        pageSize, setPageSize,
        totalPages, totalCount,
        rangeFrom, rangeTo,
    } = useSmartTable(filteredRows, { defaultPageSize: 40 });

    if (rows.length === 0) return null;

    const STATUS_TABS: { key: StatusFilter; label: string; count: number; color: string }[] = [
        { key: 'ALL',     label: 'Todos',       count: rows.length,    color: '' },
        { key: 'debt',    label: '🔴 Nos deben', count: counts.debt,   color: 'text-red-500' },
        { key: 'credit',  label: '🟢 Le debemos',count: counts.credit, color: 'text-green-500' },
        { key: 'settled', label: '✅ Al día',    count: counts.settled, color: 'text-ios-subtext' },
    ];

    return (
        <div className="glass-panel rounded-2xl overflow-hidden animate-fade-in">

            {/* Header */}
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="font-bold text-sm tracking-wide">🧾 Balance por Vendedor</h3>
                        <p className="text-xs text-ios-subtext mt-0.5">{rangeLabel}</p>
                    </div>
                    <span className="text-xs font-semibold text-ios-subtext">{totalCount} registro(s)</span>
                </div>

                {/* Tabs de estado */}
                <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl gap-0.5 overflow-x-auto no-scrollbar mb-3">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                                statusFilter === tab.key
                                    ? 'bg-white dark:bg-black/80 shadow-sm text-ios-text'
                                    : 'text-ios-subtext hover:text-ios-text'
                            }`}
                        >
                            {tab.label}
                            <span className={`text-[10px] font-bold opacity-70 ${tab.color}`}>
                                ({tab.count})
                            </span>
                        </button>
                    ))}
                </div>

                {/* Chips de moneda */}
                {availableCurrencies.length > 1 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-ios-subtext uppercase tracking-wider">Moneda:</span>
                        <CurrencyChips
                            currencies={availableCurrencies}
                            selected={currencyFilter}
                            onSelect={(cur) => { setCurrencyFilter(cur); setPage(1); }}
                        />
                    </div>
                )}
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-black/5 dark:bg-white/5 text-ios-subtext text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-5 py-3 text-left font-semibold">Vendedor</th>
                            <th className="px-5 py-3 text-right font-semibold">Moneda</th>
                            <th className="px-5 py-3 text-right font-semibold">Deuda Total</th>
                            <th className="px-5 py-3 text-right font-semibold">Pagado</th>
                            <th className="px-5 py-3 text-right font-semibold">Retiros</th>
                            <th className="px-5 py-3 text-right font-semibold">Créditos</th>
                            <th className="px-5 py-3 text-right font-semibold">Balance</th>
                            <th className="px-5 py-3 text-center font-semibold">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center py-10 text-ios-subtext italic text-sm">
                                    No hay vendedores que coincidan con los filtros aplicados.
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, i) => (
                                <tr key={i} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-3 font-semibold">{row.sellerName}</td>
                                    <td className="px-5 py-3 text-right text-ios-subtext font-mono text-xs">{row.currency}</td>
                                    <td className="px-5 py-3 text-right font-bold">{fmt(row.totalBank)}</td>
                                    <td className="px-5 py-3 text-right text-ios-green font-bold">{fmt(row.totalPaid)}</td>
                                    <td className="px-5 py-3 text-right text-blue-500 font-bold">
                                        {row.totalPayouts > 0 ? fmt(row.totalPayouts) : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-right text-amber-500 font-bold">
                                        {row.totalCredits > 0 ? fmt(row.totalCredits) : '—'}
                                    </td>
                                    <td className={`px-5 py-3 text-right font-black text-base ${
                                        row.balance > 0.01 ? 'text-red-500' :
                                        row.balance < -0.01 ? 'text-green-500' : 'text-ios-subtext'
                                    }`}>
                                        {row.balance > 0 ? '+' : ''}{fmt(row.balance)}
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
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginador */}
            {totalCount > 0 && (
                <TablePaginator
                    page={page}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    rangeFrom={rangeFrom}
                    rangeTo={rangeTo}
                    setPage={setPage}
                    setPageSize={setPageSize}
                />
            )}
        </div>
    );
};
