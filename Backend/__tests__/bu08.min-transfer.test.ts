/**
 * BU-8: Validación de monto mínimo de transferencia
 *
 * MIN_TRANSFER_AMOUNT=10 (set in vitest.config.ts)
 * Tests verify that transfers below the minimum are rejected at both
 * the route validation layer and the service layer.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { resetDb, createUser, type TestUser } from './helpers/testDb.js';

let alice: TestUser;
let bob: TestUser;

beforeAll(() => {
  resetDb();
  alice = createUser('Alice', 'alice@test.com', 'password123', 'user', 5000);
  bob   = createUser('Bob',   'bob@test.com',   'password123', 'user', 1000);
});

describe('BU-8: Monto mínimo de transferencia (MIN=10)', () => {
  it('rejects transfer with amount = 0', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ destinationAccountNumber: bob.accountNumber, amount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects transfer with amount below minimum (amount=5, min=10)', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ destinationAccountNumber: bob.accountNumber, amount: 5 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).toMatch(/10/);
  });

  it('rejects transfer with amount = MIN - 0.01 (9.99)', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ destinationAccountNumber: bob.accountNumber, amount: 9.99 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('accepts transfer with amount exactly at minimum (amount=10)', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ destinationAccountNumber: bob.accountNumber, amount: 10, description: 'min amount test' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.amount).toBe(10);
  });

  it('accepts transfer with amount above minimum (amount=100)', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ destinationAccountNumber: bob.accountNumber, amount: 100 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('rejects transfer with negative amount', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ destinationAccountNumber: bob.accountNumber, amount: -50 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects transfer with missing amount field', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ destinationAccountNumber: bob.accountNumber });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
