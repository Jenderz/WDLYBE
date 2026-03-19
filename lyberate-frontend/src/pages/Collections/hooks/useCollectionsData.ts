import { useState, useEffect, useCallback } from 'react';
import { getPayments, getSellers, getSales, Payment, Seller, Sale } from '../../../services/apiService';

export const useCollectionsData = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);

    const refreshData = useCallback(async () => {
        const [p, s, sl] = await Promise.all([getPayments(), getSales(), getSellers()]);
        setPayments(p);
        setSales(s);
        setSellers(sl);
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    return {
        payments,
        sellers,
        sales,
        refreshData
    };
};
