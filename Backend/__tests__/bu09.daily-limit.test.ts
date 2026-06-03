/**
 * BU-9: Validación de límite diario acumulado
 *
 * DAILY_TRANSFER_LIMIT=3000, MIN_TRANSFER_AMOUNT=10 (vitest.config.ts)
 * Alice starts with 10000 balance.
 * Tests verify that the cumulative daily outgoing transfer total
 * cannot exceed DAILY_TRANSFER_LIMIT.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import {
  resetDb,
  createUser,
  insertTransferToday,
  getAccountId,
  type TestUser,
} from './helpers/testDb.js';

let alice: TestUser;
let bob: TestUser;

beforeAll(() => {
  resetDb();
  alice = createUser('Alice', 'alice@test.com', 'password123', 'user', 10000);
  bob   = createUser('Bob',   'bob@test.com',   'password123', 'user', 0);
});

describe('BU-9: Límite diario acumulado (LIMIT=3000)', () => {
  it('allows first transfer within daily limit (1000)', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ destinationAccountNumber: bob.accountNumber, amount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('allows second transfer that brings total to limit (2000 more → 3000 total)', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ destinationAccountNumber: bob.accountNumber, amount: 2000 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('rejects any transfer once daily limit is reached (even 10)', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ destinationAccountNumber: bob.accountNumber, amount: 10 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/daily transfer limit/i);
  });

  it('daily limit does not apply to deposits', async () => {
    const res = await request(app)
      .post('/api/transactions/deposit')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amount: 500 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('daily limit is per-account — bob can still transfer (fresh account)', async () => {
    const carol = createUser('Carol', 'carol@test.com', 'password123', 'user', 5000);
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${carol.token}`)
      .send({ destinationAccountNumber: bob.accountNumber, amount: 500 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('correctly reports remaining limit in error message', async () => {
    const dave = createUser('Dave', 'dave@test.com', 'password123', 'user', 5000);
    const aliceAccountId = getAccountId(alice.accountNumber!);

    insertTransferToday(aliceAccountId, 2900);

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${dave.token}`)
      .send({ destinationAccountNumber: bob.accountNumber, amount: 200 });

    expect(res.status).toBe(201);
  });
});
