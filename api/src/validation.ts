import {
  TRANSACTION_TYPES,
  CATEGORIES,
} from './types';
import type {
  ValidationResult,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionType,
  Category,
} from './types';

/**
 * Validate the body for POST /api/transactions. Returns a discriminated
 * union so callers can branch on `ok` and rely on `data` being typed.
 */
export function validateCreate(body: unknown): ValidationResult<CreateTransactionInput> {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;

  // type
  if (typeof b.type !== 'string') {
    return { ok: false, error: 'type is required and must be a string' };
  }
  if (!TRANSACTION_TYPES.includes(b.type as TransactionType)) {
    return { ok: false, error: `type must be one of: ${TRANSACTION_TYPES.join(', ')}` };
  }

  // amount
  if (typeof b.amount !== 'number' || !Number.isFinite(b.amount)) {
    return { ok: false, error: 'amount is required and must be a number' };
  }
  if (b.amount <= 0) {
    return { ok: false, error: 'amount must be greater than 0' };
  }

  // category
  if (typeof b.category !== 'string') {
    return { ok: false, error: 'category is required and must be a string' };
  }
  if (!CATEGORIES.includes(b.category as Category)) {
    return { ok: false, error: `category must be one of: ${CATEGORIES.join(', ')}` };
  }

  // date
  if (typeof b.date !== 'string' || !isValidDateString(b.date)) {
    return { ok: false, error: 'date must be a valid YYYY-MM-DD calendar date' };
  }

  // description (optional)
  let description: string | null = null;
  if (b.description !== undefined && b.description !== null) {
    if (typeof b.description !== 'string') {
      return { ok: false, error: 'description must be a string when present' };
    }
    description = b.description;
  }

  return {
    ok: true,
    data: {
      type: b.type as TransactionType,
      amount: b.amount,
      category: b.category as Category,
      date: b.date,
      description,
    },
  };
}

/**
 * Validate the body for PUT /api/transactions/:id. All fields are optional
 * but at least one must be present.
 */
export function validateUpdate(body: unknown): ValidationResult<UpdateTransactionInput> {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;
  const update: UpdateTransactionInput = {};

  if ('type' in b) {
    if (typeof b.type !== 'string' || !TRANSACTION_TYPES.includes(b.type as TransactionType)) {
      return { ok: false, error: `type must be one of: ${TRANSACTION_TYPES.join(', ')}` };
    }
    update.type = b.type as TransactionType;
  }
  if ('amount' in b) {
    if (typeof b.amount !== 'number' || !Number.isFinite(b.amount) || b.amount <= 0) {
      return { ok: false, error: 'amount must be a positive number' };
    }
    update.amount = b.amount;
  }
  if ('category' in b) {
    if (typeof b.category !== 'string' || !CATEGORIES.includes(b.category as Category)) {
      return { ok: false, error: `category must be one of: ${CATEGORIES.join(', ')}` };
    }
    update.category = b.category as Category;
  }
  if ('date' in b) {
    if (typeof b.date !== 'string' || !isValidDateString(b.date)) {
      return { ok: false, error: 'date must be a valid YYYY-MM-DD calendar date' };
    }
    update.date = b.date;
  }
  if ('description' in b) {
    if (b.description !== null && typeof b.description !== 'string') {
      return { ok: false, error: 'description must be a string or null' };
    }
    update.description = (b.description as string | null) ?? null;
  }

  if (Object.keys(update).length === 0) {
    return { ok: false, error: 'At least one updatable field must be provided' };
  }

  return { ok: true, data: update };
}

function isValidDateString(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}
