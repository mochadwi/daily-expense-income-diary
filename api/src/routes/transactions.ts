import { Router, type Request, type Response, type NextFunction } from 'express';
import type { Database as DBType } from 'better-sqlite3';
import { validateCreate, validateUpdate } from '../validation';
import {
  TRANSACTION_TYPES,
  CATEGORIES,
  SORT_FIELDS,
  ORDERS,
} from '../types';
import type {
  Transaction,
  SortField,
  SortOrder,
  TransactionType,
  Category,
} from '../types';

/**
 * Build the router for /api/transactions. All DB operations are synchronous
 * via better-sqlite3 — no async wrappers required, errors are forwarded to
 * Express via next(err).
 */
export function transactionsRouter(db: DBType): Router {
  const router = Router();

  // GET /api/transactions — list with optional filters and sort
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, category, sortBy, order } = req.query;

      // Whitelist defaults: invalid values fall back to the spec's defaults.
      const sortField: SortField = SORT_FIELDS.includes(sortBy as SortField)
        ? (sortBy as SortField)
        : 'date';
      const sortOrder: SortOrder = ORDERS.includes(order as SortOrder)
        ? (order as SortOrder)
        : 'desc';

      const conditions: string[] = [];
      const params: (string)[] = [];

      if (type !== undefined) {
        if (typeof type !== 'string' || !TRANSACTION_TYPES.includes(type as TransactionType)) {
          return res
            .status(400)
            .json({ success: false, error: `type must be one of: ${TRANSACTION_TYPES.join(', ')}` });
        }
        conditions.push('type = ?');
        params.push(type);
      }
      if (category !== undefined) {
        if (typeof category !== 'string' || !CATEGORIES.includes(category as Category)) {
          return res
            .status(400)
            .json({ success: false, error: `category must be one of: ${CATEGORIES.join(', ')}` });
        }
        conditions.push('category = ?');
        params.push(category);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      // sortField and sortOrder are whitelisted enums — safe to interpolate.
      // Tie-break on id so order is deterministic when sortBy values tie.
      const sql = `SELECT * FROM transactions ${where} ORDER BY ${sortField} ${sortOrder.toUpperCase()}, id ${sortOrder.toUpperCase()}`;
      const rows = db.prepare(sql).all(...params) as Transaction[];
      res.json({ success: true, data: rows });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/transactions — create
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = validateCreate(req.body);
      if (!result.ok) {
        return res.status(400).json({ success: false, error: result.error });
      }
      const { type, amount, category, date, description } = result.data;
      const stmt = db.prepare(
        `INSERT INTO transactions (type, amount, category, date, description)
         VALUES (?, ?, ?, ?, ?)`
      );
      const info = stmt.run(type, amount, category, date, description);
      const created = db
        .prepare('SELECT * FROM transactions WHERE id = ?')
        .get(info.lastInsertRowid) as Transaction;
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/transactions/:id — read single
  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) {
        return res
          .status(400)
          .json({ success: false, error: 'id must be a positive integer' });
      }
      const row = db
        .prepare('SELECT * FROM transactions WHERE id = ?')
        .get(id) as Transaction | undefined;
      if (!row) {
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }
      res.json({ success: true, data: row });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/transactions/:id — update
  router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) {
        return res
          .status(400)
          .json({ success: false, error: 'id must be a positive integer' });
      }
      const result = validateUpdate(req.body);
      if (!result.ok) {
        return res.status(400).json({ success: false, error: result.error });
      }
      const fields = Object.keys(result.data);
      const setClauses = fields.map((f) => `${f} = ?`).join(', ');
      const values = fields.map((f) => (result.data as Record<string, unknown>)[f]);
      const stmt = db.prepare(
        `UPDATE transactions
         SET ${setClauses}, updated_at = datetime('now')
         WHERE id = ?`
      );
      const info = stmt.run(...values, id);
      if (info.changes === 0) {
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }
      const updated = db
        .prepare('SELECT * FROM transactions WHERE id = ?')
        .get(id) as Transaction;
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/transactions/:id — delete
  router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) {
        return res
          .status(400)
          .json({ success: false, error: 'id must be a positive integer' });
      }
      const info = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
      if (info.changes === 0) {
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }
      res.json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

function parseId(raw: string | undefined): number | null {
  if (typeof raw !== 'string') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}
