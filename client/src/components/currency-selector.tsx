import { useCurrency, type Currency } from "@/lib/currency-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DollarSign, Euro, PoundSterling, Coins } from "lucide-react";

const currencyOptions: { code: Currency; name: string; symbol: string; icon: typeof DollarSign }[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', icon: DollarSign },
  { code: 'EUR', name: 'Euro', symbol: '€', icon: Euro },
  { code: 'GBP', name: 'British Pound', symbol: '£', icon: PoundSterling },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', icon: DollarSign },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', icon: DollarSign },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', icon: Coins },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', icon: Coins },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', icon: Coins },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', icon: Coins },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', icon: Coins },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', icon: Coins },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', icon: Coins },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', icon: Coins },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', icon: DollarSign },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', icon: DollarSign },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', icon: DollarSign },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', icon: Coins },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', icon: Coins },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', icon: Coins },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', icon: Coins },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', icon: Coins },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', icon: DollarSign },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', icon: DollarSign },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', icon: DollarSign },
];

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();

  const currentCurrency = currencyOptions.find(option => option.code === currency);
  const CurrentIcon = currentCurrency?.icon || DollarSign;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CurrentIcon className="h-4 w-4" />
          {currentCurrency?.symbol}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {currencyOptions.map((option) => (
          <DropdownMenuItem
            key={option.code}
            onClick={() => setCurrency(option.code)}
            className="gap-2"
          >
            <option.icon className="h-4 w-4" />
            <span>{option.name}</span>
            <span className="ml-auto text-muted-foreground">{option.symbol}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}