export type TransactionType = 'expense' | 'income';
export type Category = 'Food' | 'Transport' | 'Salary' | 'Entertainment' | 'Utilities' | 'Healthcare' | 'Others';

export const TRANSACTION_TYPES: readonly TransactionType[] = ['expense', 'income'];
export const CATEGORIES: readonly Category[] = [
  'Food',
  'Transport',
  'Salary',
  'Entertainment',
  'Utilities',
  'Healthcare',
  'Others',
];

export type SortField = 'date' | 'amount';
export type SortOrder = 'asc' | 'desc';

export const SORT_FIELDS: readonly SortField[] = ['date', 'amount'];
export const ORDERS: readonly SortOrder[] = ['asc', 'desc'];

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  category: Category;
  date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  category: Category;
  date: string;
  description: string | null;
}

export interface UpdateTransactionInput {
  type?: TransactionType;
  amount?: number;
  category?: Category;
  date?: string;
  description?: string | null;
}

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string };
