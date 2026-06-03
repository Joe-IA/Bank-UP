/**
 * BU-11: Transferencia
 *
 * Tests the full transfer flow: authentication, validation,
 * balance updates on both accounts, and transaction record creation.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { resetDb, createUser, getBalance, type TestUser } from './helpers/testDb.js';

let alice: TestUser;
let bob: TestUser;

beforeAll(() => {
  resetDb();
  alice = createUser('Alice', 'alice@test.com', 'password123', 'user', 5000);
  bob   = createUser('Bob',   'bob@test.com',   'password123', 'user', 1000);
});

describe('BU-11: Transferencia — autenticación', () => {
  it('rejects transfer without token', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .send({ destinationAccountNumber: bob.accountNumber, amount: 100 });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects transfer with malformed token', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({ destinationAccountNumber: bob.accountNumber, amount: 100 });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('BU-11: Transferencia — validaciones de negocio', () => {
  it('rejects transfer to own account', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ destinationAccountNumber: alice.accountNumber, amount: 100 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/own account/i);
  });

  it('rejects transfer to non-existent account', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ destinationAccountNumber: 'ACC-999999', amount: 100 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('rejects transfer when insufficient funds', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ destinationAccountNumber: bob.accountNumber, amount: 99999 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insufficient/i);
  });

  it('rejects transfer with missing destination', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amount: 100 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('BU-11: Transferencia — flujo exitoso', () => {
  it('executes transfer and updates both balances atomically', async () => {
    const aliceBefore = getBalance(alice.accountNumber!);
    const bobBefore   = getBalance(bob.accountNumber!);

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ destinationAccountNumber: bob.accountNumber, amount: 200, description: 'test transfer' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('transfer');
    expect(res.body.data.amount).toBe(200);

    expect(getBalance(alice.accountNumber!)).toBe(aliceBefore - 200);
    expect(getBalance(bob.accountNumber!)).toBe(bobBefore + 200);
  });

  it('transfer appears in sender transaction history', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    const transfers = res.body.data.filter((t: { type: string }) => t.type === 'transfer');
    expect(transfers.length).toBeGreaterThan(0);
  });

  it('transfer appears in receiver transaction history', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(200);
    const inbound = res.body.data.filter(
      (t: { type: string; destination_account_number: string }) =>
        t.type === 'transfer' && t.destination_account_number === bob.accountNumber
    );
    expect(inbound.length).toBeGreaterThan(0);
  });
});
