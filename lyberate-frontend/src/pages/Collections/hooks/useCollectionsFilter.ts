import { useMemo } from 'react';
import { Payment } from '../../../services/apiService';
import { useWeeklyFilter } from '../../../hooks/useWeeklyFilter';

// Re-export para compatibilidad con componentes que importan FilterPreset de aquí
export type { FilterPreset } from '../../../hooks/useWeeklyFilter';

export const useCollectionsFilter = (payments: Payment[]) => {
    const weeklyFilter = useWeeklyFilter();
    const { filterRange, searchQuery } = weeklyFilter;

    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            if (filterRange) {
                const d = new Date(p.date + 'T12:00:00');
                if (d < filterRange.start || d > filterRange.end) return false;
            }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!p.vendorName.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [payments, filterRange, searchQuery]);

    const pendingPayments = useMemo(() => filteredPayments.filter(p => p.status === 'pending'), [filteredPayments]);

    // KPIs
    const totalCollected = useMemo(() => filteredPayments
        .filter(p => p.status === 'approved' && p.currency === 'USD' && p.type !== 'credit')
        .reduce((sum, p) => sum + p.amount, 0), [filteredPayments]);

    const totalPending = useMemo(() => pendingPayments
        .filter(p => p.currency === 'USD' && p.type !== 'credit')
        .reduce((sum, p) => sum + p.amount, 0), [pendingPayments]);

    const totalCredits = useMemo(() => filteredPayments
        .filter(p => p.status === 'approved' && p.currency === 'USD' && p.type === 'credit')
        .reduce((sum, p) => sum + p.amount, 0), [filteredPayments]);

    return {
        ...weeklyFilter,
        filteredPayments,
        pendingPayments,
        totalCollected,
        totalPending,
        totalCredits
    };
};
