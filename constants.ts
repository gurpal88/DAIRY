
import { Customer, DailyLog, Area } from './types';

export const AREAS: Area[] = ['North Sector', 'South Park', 'East Gate', 'West Hills', 'City Center'];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: '1', name: 'John Doe', phone: '9876543210', area: 'North Sector', pricePerLiter: 60, joinedDate: '2023-01-15', status: 'active' },
  { id: '2', name: 'Alice Smith', phone: '9876543211', area: 'South Park', pricePerLiter: 62, joinedDate: '2023-02-20', status: 'active' },
  { id: '3', name: 'Bob Johnson', phone: '9876543212', area: 'North Sector', pricePerLiter: 60, joinedDate: '2023-03-10', status: 'active' },
  { id: '4', name: 'Charlie Brown', phone: '9876543213', area: 'East Gate', pricePerLiter: 58, joinedDate: '2023-05-05', status: 'active' },
];

export const INITIAL_LOGS: DailyLog[] = [
  { id: 'L1', customerId: '1', date: new Date().toISOString().split('T')[0], liters: 3.5, isPaid: false },
  { id: 'L2', customerId: '2', date: new Date().toISOString().split('T')[0], liters: 2.0, isPaid: false },
];
