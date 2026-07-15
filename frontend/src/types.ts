// Shared types — kept in sync with api/src/types.ts.
// Re-declared here (rather than imported across packages) to keep the
// frontend self-contained and avoid pulling the backend code into Vite.

export type TransactionType = 'expense' | 'income';
export type Category =
  | 'Food'
  | 'Transport'
  | 'Salary'
  | 'Entertainment'
  | 'Utilities'
  | 'Healthcare'
  | 'Others';

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
  date: string; // ISO 'YYYY-MM-DD'
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateTransactionInput = {
  type: TransactionType;
  amount: number;
  category: Category;
  date: string;
  description: string | null;
};

export type UpdateTransactionInput = Partial<CreateTransactionInput>;

export interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ListFilters {
  type?: TransactionType;
  category?: Category;
  sortBy?: SortField;
  order?: SortOrder;
}
