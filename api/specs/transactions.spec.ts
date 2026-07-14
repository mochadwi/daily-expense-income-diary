import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import type { Transaction } from '../src/types';

const bundle = createApp(':memory:');
const { app, reset, close } = bundle;

const validPayload: Omit<Transaction, 'id' | 'created_at' | 'updated_at'> = {
  type: 'expense',
  amount: 25.5,
  category: 'Food',
  date: '2024-07-14',
  description: 'Lunch with team',
};

afterAll(() => {
  close();
});

describe('Transactions API', () => {
  beforeEach(() => {
    reset();
  });

  describe('POST /api/transactions', () => {
    it('creates a transaction and returns 201 with the row', async () => {
      const res = await request(app).post('/api/transactions').send(validPayload);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const row = res.body.data as Transaction;
      expect(row.id).toBeDefined();
      expect(row.type).toBe('expense');
      expect(row.amount).toBe(25.5);
      expect(row.category).toBe('Food');
      expect(row.date).toBe('2024-07-14');
      expect(row.description).toBe('Lunch with team');
      expect(row.created_at).toBeTruthy();
      expect(row.updated_at).toBeTruthy();
    });

    it('uses sequential IDs that start at 1 (sequence reset works)', async () => {
      const a = await request(app).post('/api/transactions').send(validPayload);
      const b = await request(app).post('/api/transactions').send(validPayload);
      expect(a.body.data.id).toBe(1);
      expect(b.body.data.id).toBe(2);
    });

    it('returns 400 when type is invalid', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({ ...validPayload, type: 'transfer' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/type must be/);
    });

    it('returns 400 when amount is negative', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({ ...validPayload, amount: -10 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/amount/);
    });

    it('returns 400 when amount is zero', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({ ...validPayload, amount: 0 });
      expect(res.status).toBe(400);
    });

    it('returns 400 when category is not in the allowed set', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({ ...validPayload, category: 'Crypto' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/category must be/);
    });

    it('returns 400 when date is malformed', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({ ...validPayload, date: 'not-a-date' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when date is an impossible calendar date (2024-02-30)', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({ ...validPayload, date: '2024-02-30' });
      expect(res.status).toBe(400);
    });

    it('allows description to be omitted', async () => {
      const { description, ...payload } = validPayload;
      const res = await request(app).post('/api/transactions').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.data.description).toBeNull();
      expect(description).toBeDefined(); // sanity: we just stripped it locally
    });
  });

  describe('GET /api/transactions', () => {
    beforeEach(async () => {
      await request(app).post('/api/transactions').send({
        type: 'income',
        amount: 1000,
        category: 'Salary',
        date: '2024-07-01',
        description: 'July salary',
      });
      await request(app).post('/api/transactions').send({
        type: 'expense',
        amount: 50,
        category: 'Food',
        date: '2024-07-02',
        description: 'Groceries',
      });
      await request(app).post('/api/transactions').send({
        type: 'expense',
        amount: 30,
        category: 'Transport',
        date: '2024-07-03',
        description: 'Bus pass',
      });
    });

    it('returns the array of transactions in default order (date desc)', async () => {
      const res = await request(app).get('/api/transactions');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data.map((t: Transaction) => t.date)).toEqual([
        '2024-07-03',
        '2024-07-02',
        '2024-07-01',
      ]);
    });

    it('filters by type=expense', async () => {
      const res = await request(app).get('/api/transactions?type=expense');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((t: Transaction) => t.type === 'expense')).toBe(true);
    });

    it('filters by category=Food', async () => {
      const res = await request(app).get('/api/transactions?category=Food');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].category).toBe('Food');
    });

    it('combines filters (type=expense & category=Transport)', async () => {
      const res = await request(app).get('/api/transactions?type=expense&category=Transport');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].category).toBe('Transport');
    });

    it('returns 400 if type filter is invalid', async () => {
      const res = await request(app).get('/api/transactions?type=transfer');
      expect(res.status).toBe(400);
    });

    it('sorts by amount desc', async () => {
      const res = await request(app).get('/api/transactions?sortBy=amount&order=desc');
      const amounts = res.body.data.map((t: Transaction) => t.amount);
      expect(amounts).toEqual([1000, 50, 30]);
    });

    it('sorts by amount asc', async () => {
      const res = await request(app).get('/api/transactions?sortBy=amount&order=asc');
      const amounts = res.body.data.map((t: Transaction) => t.amount);
      expect(amounts).toEqual([30, 50, 1000]);
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('returns the transaction', async () => {
      const created = await request(app).post('/api/transactions').send(validPayload);
      const id = created.body.data.id;
      const res = await request(app).get(`/api/transactions/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(id);
      expect(res.body.data.amount).toBe(25.5);
    });

    it('returns 404 for a missing id', async () => {
      const res = await request(app).get('/api/transactions/99999');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for a non-integer id', async () => {
      const res = await request(app).get('/api/transactions/abc');
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/transactions/:id', () => {
    it('updates an existing transaction', async () => {
      const created = await request(app).post('/api/transactions').send(validPayload);
      const id = created.body.data.id;
      const res = await request(app)
        .put(`/api/transactions/${id}`)
        .send({ amount: 99.99, description: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.data.amount).toBe(99.99);
      expect(res.body.data.description).toBe('Updated');
      expect(res.body.data.id).toBe(id);
      // updated_at should be later than created_at
      expect(res.body.data.updated_at >= res.body.data.created_at).toBe(true);
    });

    it('returns 404 for a missing id', async () => {
      const res = await request(app).put('/api/transactions/99999').send({ amount: 1 });
      expect(res.status).toBe(404);
    });

    it('returns 400 when body has no fields', async () => {
      const created = await request(app).post('/api/transactions').send(validPayload);
      const res = await request(app).put(`/api/transactions/${created.body.data.id}`).send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/at least one/i);
    });

    it('returns 400 when an invalid value is provided', async () => {
      const created = await request(app).post('/api/transactions').send(validPayload);
      const res = await request(app)
        .put(`/api/transactions/${created.body.data.id}`)
        .send({ amount: -1 });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    it('deletes an existing transaction', async () => {
      const created = await request(app).post('/api/transactions').send(validPayload);
      const id = created.body.data.id;
      const res = await request(app).delete(`/api/transactions/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
      const check = await request(app).get(`/api/transactions/${id}`);
      expect(check.status).toBe(404);
    });

    it('returns 404 for a missing id', async () => {
      const res = await request(app).delete('/api/transactions/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('health check', () => {
    it('GET /health returns ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ok');
    });
  });

  describe('404 fallthrough', () => {
    it('returns not found for unknown routes', async () => {
      const res = await request(app).get('/api/unknown');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
