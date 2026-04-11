import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CHF' | 'SEK' | 'NOK' | 'DKK' | 'PLN' | 'CZK' | 'HUF' | 'BRL' | 'MXN' | 'ARS' | 'TRY' | 'ZAR' | 'INR' | 'CNY' | 'KRW' | 'SGD' | 'HKD' | 'NZD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertAmount: (amount: number, fromCurrency?: Currency, toCurrency?: Currency) => number;
  formatAmount: (amount: number, fromCurrency?: Currency) => string;
  hasSelectedCurrency: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Exchange rates relative to USD (as of January 2026 - these would ideally come from an API)
const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.35,
  AUD: 1.52,
  JPY: 152.0,
  CHF: 0.88,
  SEK: 10.85,
  NOK: 10.75,
  DKK: 6.95,
  PLN: 4.05,
  CZK: 23.5,
  HUF: 365.0,
  BRL: 5.25,
  MXN: 18.5,
  ARS: 950.0,
  TRY: 34.0,
  ZAR: 18.5,
  INR: 84.0,
  CNY: 7.25,
  KRW: 1350.0,
  SGD: 1.35,
  HKD: 7.8,
  NZD: 1.65,
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user, getToken } = useAuth();
  const [currency, setCurrencyState] = useState<Currency>(() => {
    // Try to get from localStorage first for immediate UI
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('subveris-currency');
      if (saved && EXCHANGE_RATES[saved as Currency]) {
        return saved as Currency;
      }
    }
    return 'USD';
  });

  const [hasSelectedCurrency, setHasSelectedCurrency] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('subveris-currency');
      return !!saved && !!EXCHANGE_RATES[saved as Currency];
    }
    return false;
  });

  const setCurrency = (newCurrency: Currency) => {
    if (EXCHANGE_RATES[newCurrency]) {
      setCurrencyState(newCurrency);
      setHasSelectedCurrency(true);
      
      // Persist to localStorage immediately
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('subveris-currency', newCurrency);
        } catch (error) {
          console.warn('Failed to save currency preference to localStorage:', error);
        }
      }

      // persist to server if logged in
      if (user) {
        getToken()
          .then((token) => {
            return fetch('/api/user/currency', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ currency: newCurrency }),
            });
          })
          .then((res) => {
            if (!res.ok) {
              console.warn('Failed to save currency preference to server');
            }
          })
          .catch((err) => console.error('Error updating currency on server:', err));
      }
    } else {
      console.warn(`Attempted to set invalid currency "${newCurrency}", defaulting to USD`);
      setCurrencyState('USD');
    }
  };

  // Sync with server when user logs in, but ONLY if localStorage is empty
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem('subveris-currency');
      if (saved && EXCHANGE_RATES[saved as Currency]) {
        // We already have a local preference, don't let server overwrite it
        // unless we want server to be source of truth. Usually local is faster.
        return;
      }

      getToken()
        .then((token) =>
          fetch('/api/user/premium-status', {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
        .then((res) => res.json())
        .then((data) => {
          if (data.currency && EXCHANGE_RATES[data.currency as Currency]) {
            setCurrencyState(data.currency as Currency);
            setHasSelectedCurrency(true);
            localStorage.setItem('subveris-currency', data.currency);
          }
        })
        .catch((err) => {
          console.warn('Failed to load currency from server:', err);
        });
    }
  }, [user]);

  const convertAmount = (amount: number, fromCurrency: Currency = 'USD', toCurrency: Currency = currency): number => {
    // Convert to USD first, then to target currency
    const usdAmount = amount / EXCHANGE_RATES[fromCurrency];
    return usdAmount * EXCHANGE_RATES[toCurrency];
  };

  const formatAmount = (amount: number, fromCurrency: Currency = 'USD'): string => {
    const convertedAmount = convertAmount(amount, fromCurrency, currency);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(convertedAmount);
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      convertAmount,
      formatAmount,
      hasSelectedCurrency,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}