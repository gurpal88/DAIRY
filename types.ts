
export type Area = string;

export interface Customer {
  id: string;
  name: string;
  phone: string;
  area: Area;
  pricePerLiter: number;
  joinedDate: string;
  status: 'active' | 'inactive';
}

export interface DailyLog {
  id: string;
  customerId: string;
  date: string;
  liters: number;
  isPaid: boolean;
}

export interface PaymentRecord {
  id: string;
  customerId: string;
  amount: number;
  date: string;
  method: string;
  period: string; // e.g., "Oct 2023" or "All dues up to date"
}

export type View = 'dashboard' | 'customers' | 'daily-entry' | 'reports' | 'ai-insights' | 'settings' | 'payments';

export type TimeRange = '7d' | '30d' | 'all';
