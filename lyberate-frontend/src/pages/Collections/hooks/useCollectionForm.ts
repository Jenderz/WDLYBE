import { useState, useMemo, useEffect } from 'react';
import {
    PaymentMethod, PaymentType, Payment, Sale, Seller,
    addPayment, getWeeklyPeriods, dateToWeekId, getAvailableCurrencies
} from '../../../services/apiService';

export const useCollectionForm = (
    sellers: Seller[],
    sales: Sale[],
    payments: Payment[],
    onSuccess: () => void
) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currencies, setCurrencies] = useState<string[]>(['DOLAR']);

    // Load currencies on mount
    useEffect(() => {
        getAvailableCurrencies().then(setCurrencies).catch(() => { });
    }, []);

    // Modal form states
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formSellerId, setFormSellerId] = useState('');
    const [formCurrency, setFormCurrency] = useState('DOLAR');
    const [formAmount, setFormAmount] = useState<number | ''>('');
    const [formBank, setFormBank] = useState('');
    const [formMethod, setFormMethod] = useState<PaymentMethod>('Transferencia');
    const [formReference, setFormReference] = useState('');

    const selectedSeller = sellers.find(s => String(s.id) === formSellerId);
    const formDateWeekId = formDate ? dateToWeekId(formDate) : '';

    const sellerSales = useMemo(() => {
        if (!formSellerId || !formDateWeekId) return [];
        return sales.filter(s =>
            String(s.sellerId) === formSellerId &&
            s.currencyName === formCurrency &&
            dateToWeekId(s.date) === formDateWeekId
        );
    }, [sales, formSellerId, formCurrency, formDateWeekId]);

    const sellerPaidInWeek = useMemo(() => {
        if (!formSellerId || !formDateWeekId) return 0;
        return payments
            .filter(p =>
                String(p.sellerId) === formSellerId &&
                p.currency === formCurrency &&
                dateToWeekId(p.date) === formDateWeekId &&
                p.status === 'approved' &&
                p.type !== 'credit'
            )
            .reduce((sum, p) => sum + p.amount, 0);
    }, [payments, formSellerId, formCurrency, formDateWeekId]);

    const totalBank = sellerSales.reduce((sum, s) => sum + s.totalBank, 0);
    const balance = totalBank - sellerPaidInWeek;
    const difference = balance - Number(formAmount || 0);

    const resetForm = () => {
        setFormAmount('');
        setFormReference('');
        setFormBank('');
        setFormSellerId('');
    };

    const handleRegisterPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formSellerId || !formAmount || !formBank || !formReference) return;

        const enteredAmount = Math.abs(Number(formAmount));
        const actualDate = new Date().toISOString().split('T')[0];
        const basePayload = {
            vendorId: selectedSeller?.id || '',
            vendorName: selectedSeller?.name || 'Administrador',
            sellerId: formSellerId,
            week: getWeeklyPeriods([actualDate])[0]?.label || '',
            weekId: dateToWeekId(actualDate),
            currency: formCurrency,
            bank: formBank,
            method: formMethod,
            reference: formReference,
            date: actualDate,
            status: 'approved' as const,
        };

        if (balance <= 0) {
            await addPayment({ ...basePayload, amount: enteredAmount, type: 'credit' as PaymentType });
        } else if (enteredAmount <= balance) {
            await addPayment({ ...basePayload, amount: enteredAmount, type: 'payment' as PaymentType });
        } else {
            await addPayment({ ...basePayload, amount: balance, type: 'payment' as PaymentType });
            await addPayment({
                ...basePayload,
                amount: enteredAmount - balance,
                type: 'credit' as PaymentType,
                reference: `${formReference}-CREDIT`,
            });
        }

        setIsModalOpen(false);
        resetForm();
        onSuccess();
    };

    return {
        isModalOpen,
        setIsModalOpen,
        currencies,
        formDate, setFormDate,
        formSellerId, setFormSellerId,
        formCurrency, setFormCurrency,
        formAmount, setFormAmount,
        formBank, setFormBank,
        formMethod, setFormMethod,
        formReference, setFormReference,
        totalBank,
        balance,
        difference,
        handleRegisterPayment,
        resetForm
    };
};
