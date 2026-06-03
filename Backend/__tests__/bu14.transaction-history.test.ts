/**
 * BU-14: Registro de movimientos financieros
 *
 * Tests that every financial operation (deposit, transfer) is correctly
 * recorded and retrievable via the transaction history endpoint.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { resetDb, createUser, type TestUser } from './helpers/testDb.js';

let alice: TestUser;
let bob: TestUser;

beforeAll(async () => {
  resetDb();
  alice = createUser('Alice', 'alice@test.com', 'password123', 'user', 5000);
  bob   = createUser('Bob',   'bob@test.com',   'password123', 'user', 1000);

  await request(app)
    .post('/api/transactions/deposit')
    .set('Authorization', `Bearer ${alice.token}`)
    .send({ amount: 200, description: 'salary' });

  await request(app)
    .post('/api/transactions/transfer')
    .set('Authorization', `Bearer ${alice.token}`)
    .send({ destinationAccountNumber: bob.accountNumber, amount: 50, description: 'coffee' });
});

describe('BU-14: Registro de movimientos — acceso', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(401);
  });

  it('returns 200 with transaction list for authenticated user', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('BU-14: Registro de movimientos — integridad de datos', () => {
  it('records deposit with correct type and amount', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${alice.token}`);

    const deposit = res.body.data.find(
      (t: { type: string; amount: number }) => t.type === 'deposit' && t.amount === 200
    );
    expect(deposit).toBeDefined();
    expect(deposit.description).toBe('salary');
  });

  it('records transfer with correct origin and destination account numbers', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${alice.token}`);

    const transfer = res.body.data.find(
      (t: { type: string; amount: number }) => t.type === 'transfer' && t.amount === 50
    );
    expect(transfer).toBeDefined();
    expect(transfer.origin_account_number).toBe(alice.accountNumber);
    expect(transfer.destination_account_number).toBe(bob.accountNumber);
    expect(transfer.description).toBe('coffee');
  });

  it('shows incoming transfers in receiver history', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(200);
    const received = res.body.data.find(
      (t: { destination_account_number: string }) =>
        t.destination_account_number === bob.accountNumber
    );
    expect(received).toBeDefined();
  });

  it('returns transactions in descending order by date', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${alice.token}`);

    const dates: string[] = res.body.data.map(
      (t: { created_at: string }) => t.created_at
    );
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1] >= dates[i]).toBe(true);
    }
  });

  it('user only sees their own transactions', async () => {
    const carol = createUser('Carol', 'carol@test.com', 'password123', 'user', 500);
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${carol.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});
