/**
 * BU-12: Validación de saldo máximo permitido
 *
 * MAX_ACCOUNT_BALANCE=10000 (vitest.config.ts)
 * Tests that deposits and incoming transfers are blocked when
 * the destination account would exceed the maximum allowed balance.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { resetDb, createUser, setBalance, type TestUser } from './helpers/testDb.js';

const MAX = 10000;

let alice: TestUser;
let bob: TestUser;

beforeAll(() => {
  resetDb();
  alice = createUser('Alice', 'alice@test.com', 'password123', 'user', 5000);
  bob   = createUser('Bob',   'bob@test.com',   'password123', 'user', MAX - 100);
});

describe('BU-12: Saldo máximo en depósito', () => {
  it('rejects deposit that would exceed max balance', async () => {
    setBalance(alice.accountNumber!, MAX - 50);
    const res = await request(app)
      .post('/api/transactions/deposit')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amount: 100 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/maximum balance/i);
  });

  it('allows deposit that brings balance exactly to max', async () => {
    setBalance(alice.accountNumber!, MAX - 100);
    const res = await request(app)
      .post('/api/transactions/deposit')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amount: 100 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('allows deposit when balance is well below max', async () => {
    setBalance(alice.accountNumber!, 500);
    const res = await request(app)
      .post('/api/transactions/deposit')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amount: 100 });

    expect(res.status).toBe(201);
  });
});

describe('BU-12: Saldo máximo en transferencia (destino)', () => {
  it('rejects transfer that would push destination over max balance', async () => {
    setBalance(bob.accountNumber!, MAX - 50);
    setBalance(alice.accountNumber!, 5000);

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ destinationAccountNumber: bob.accountNumber, amount: 100 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/max balance/i);
  });

  it('allows transfer that brings destination exactly to max balance', async () => {
    setBalance(bob.accountNumber!, MAX - 100);
    setBalance(alice.accountNumber!, 5000);

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ destinationAccountNumber: bob.accountNumber, amount: 100 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
