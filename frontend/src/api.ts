import type {
  CreateTransactionInput,
  Envelope,
  ListFilters,
  Transaction,
  UpdateTransactionInput,
} from './types';

// Resolve the API base URL at module load time. The Vite dev server also
// proxies '/api' to the backend as a safety net, but VITE_API_URL is the
// authoritative source per README §10.2.
const RAW_BASE = import.meta.env.VITE_API_URL ?? '/api';
const API_BASE = (() => {
  // If it's a relative path (e.g. '/api'), keep it as-is — useful when
  // Vite's dev proxy is in play.
  if (RAW_BASE.startsWith('/')) return RAW_BASE.replace(/\/$/, '');
  // Otherwise assume it's an absolute URL and strip any trailing slash.
  return RAW_BASE.replace(/\/$/, '');
})();

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  // DELETE returns 200 with `data: null`, which still parses as JSON.
  let payload: Envelope<T> | null = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text) as Envelope<T>;
    } catch {
      throw new ApiError(`Invalid JSON from server (${response.status})`, response.status);
    }
  }

  if (!response.ok || !payload?.success) {
    const message = payload?.error ?? `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return payload.data as T;
}

function toQueryParams(filters: ListFilters): string {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.category) params.set('category', filters.category);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.order) params.set('order', filters.order);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  list: (filters: ListFilters = {}) =>
    request<Transaction[]>(`/transactions${toQueryParams(filters)}`),

  get: (id: number) => request<Transaction>(`/transactions/${id}`),

  create: (input: CreateTransactionInput) =>
    request<Transaction>(`/transactions`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: number, input: UpdateTransactionInput) =>
    request<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  remove: (id: number) =>
    request<null>(`/transactions/${id}`, { method: 'DELETE' }) as Promise<null>,
};

