import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CHF' | 'SEK' | 'NOK' | 'DKK' | 'PLN' | 'CZK' | 'HUF' | 'BRL' | 'MXN' | 'ARS' | 'TRY' | 'ZAR' | 'INR' | 'CNY' | 'KRW' | 'SGD' | 'HKD' | 'NZD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertAmount: (amount: number, fromCurrency?: Currency, toCurrency?: Currency) => number;
  formatAmount: (amount: number, fromCurrency?: Currency) => string;
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
  const [currency, setCurrencyState] = useState<Currency>('USD');

  const setCurrency = (newCurrency: Currency) => {
    if (Object.keys(EXCHANGE_RATES).includes(newCurrency)) {
      setCurrencyState(newCurrency);

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

  // Load currency preference from localStorage
  useEffect(() => {
    try {
      const savedCurrency = localStorage.getItem('subveris-currency');
      if (savedCurrency && Object.keys(EXCHANGE_RATES).includes(savedCurrency)) {
        setCurrency(savedCurrency as Currency);
      } else if (savedCurrency && !Object.keys(EXCHANGE_RATES).includes(savedCurrency)) {
        // If saved currency is invalid, remove it and default to USD
        console.warn(`Invalid currency "${savedCurrency}" found in localStorage, resetting to USD`);
        localStorage.removeItem('subveris-currency');
      }
    } catch (error) {
      console.warn('Failed to load currency preference from localStorage:', error);
    }
  }, []);

  // If the user is logged in, fetch their saved currency from the server and
  // override whatever we loaded from localStorage. We watch `user` so that
  // this effect fires once after login/sign-up.
  useEffect(() => {
    if (user) {
      getToken()
        .then((token) =>
          fetch('/api/user/premium-status', {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
        .then((res) => res.json())
        .then((data) => {
          if (data.currency && data.currency !== currency) {
            setCurrencyState(data.currency);
          }
        })
        .catch((err) => {
          console.warn('Failed to load currency from server:', err);
        });
    }
  }, [user]);

  // Save currency preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('subveris-currency', currency);
    } catch (error) {
      console.warn('Failed to save currency preference to localStorage:', error);
    }
  }, [currency]);

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