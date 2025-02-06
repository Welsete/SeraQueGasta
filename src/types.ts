export interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  type: 'income' | 'expense';
  created_at?: Date;
}

export type Period = 'all' | 'day' | 'week' | 'month' | 'year' | 'specific';

export interface MonthYear {
  month: number;
  year: number;
}

export interface User {
  id: string;
  email: string;
}