import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';

const JUAN_ACCOUNT = '1234567890123456';
const ANA_ACCOUNT = '2345678901234567';
const CARLOS_ACCOUNT = '3456789012345678';

const SEED_BALANCES: Record<string, string> = {
  [JUAN_ACCOUNT]: '9850.00',
  [ANA_ACCOUNT]: '25400.00',
  [CARLOS_ACCOUNT]: '39750.00',
};

async function loginToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token as string;
}

function doTransfer(token: string, body: object) {
  return request(app)
    .post('/api/transfers')
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

beforeEach(async () => {
  // Reset balances to seed values to start each test from a known state
  for (const [accountNumber, balance] of Object.entries(SEED_BALANCES)) {
    await prisma.account.update({ where: { accountNumber }, data: { balance } });
  }
  // Clear today's transfers to reset all daily limits
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  await prisma.transaction.deleteMany({ where: { createdAt: { gte: todayStart } } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ── BU-8: Monto mínimo ─────────────────────────────────────────────────────

describe('BU-8 — Monto mínimo de transferencia ($500)', () => {
  it('CA-05: monto $499.99 (< $500) → 422', async () => {
    const token = await loginToken('juan.perez@bancoUP.mx', 'Juan1!');
    const res = await doTransfer(token, {
      toAccountNumber: ANA_ACCOUNT,
      amount: 499.99,
      concept: 'Bajo el mínimo',
    });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/mínimo/i);
  });

  it('CA-05 (regresión): monto $0 → 422 (Zod: positivo)', async () => {
    const token = await loginToken('juan.perez@bancoUP.mx', 'Juan1!');
    const res = await doTransfer(token, {
      toAccountNumber: ANA_ACCOUNT,
      amount: 0,
      concept: 'Monto cero',
    });
    // Zod rechaza no-positivo → 400
    expect(res.status).toBe(400);
  });

  it('monto $500 exacto es aceptado (límite mínimo válido)', async () => {
    const token = await loginToken('juan.perez@bancoUP.mx', 'Juan1!');
    const res = await doTransfer(token, {
      toAccountNumber: ANA_ACCOUNT,
      amount: 500,
      concept: 'Exactamente el mínimo',
    });
    expect(res.status).toBe(201);
  });
});

// ── BU-9: Límite diario ────────────────────────────────────────────────────

describe('BU-9 — Límite diario de transferencias ($7,000)', () => {
  it('CA-06: superar el límite diario acumulado → 422', async () => {
    const token = await loginToken('juan.perez@bancoUP.mx', 'Juan1!');

    // Acumular $6,000 en tres transferencias (cada una válida)
    for (let i = 0; i < 3; i++) {
      const r = await doTransfer(token, {
        toAccountNumber: ANA_ACCOUNT,
        amount: 2000,
        concept: `Parcial ${i + 1}`,
      });
      expect(r.status).toBe(201);
    }

    // La cuarta lleva el total a $7,001 → excede límite diario
    // Juan tiene $3,850 en este punto, suficiente para $1,001
    const res = await doTransfer(token, {
      toAccountNumber: ANA_ACCOUNT,
      amount: 1001,
      concept: 'Excede límite diario',
    });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/límite diario/i);
  });

  it('CA-06 (regresión): el límite aplica por cuenta, no por usuario de destino', async () => {
    const token = await loginToken('juan.perez@bancoUP.mx', 'Juan1!');

    // $4,000 a Ana
    await doTransfer(token, { toAccountNumber: ANA_ACCOUNT, amount: 4000, concept: 'A Ana' });
    // $3,001 a Carlos → total Juan = $7,001 → rechazada
    const res = await doTransfer(token, {
      toAccountNumber: CARLOS_ACCOUNT,
      amount: 3001,
      concept: 'A Carlos supera límite',
    });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/límite diario/i);
  });

  it('exactamente $7,000 en un solo movimiento es aceptado', async () => {
    const token = await loginToken('juan.perez@bancoUP.mx', 'Juan1!');
    const res = await doTransfer(token, {
      toAccountNumber: ANA_ACCOUNT,
      amount: 7000,
      concept: 'Todo el límite diario',
    });
    expect(res.status).toBe(201);
  });
});

// ── BU-11: Transferencia exitosa ───────────────────────────────────────────

describe('BU-11 — Transferencia válida (CA-08)', () => {
  it('CA-08: devuelve 201 con estructura correcta', async () => {
    const token = await loginToken('juan.perez@bancoUP.mx', 'Juan1!');
    const res = await doTransfer(token, {
      toAccountNumber: ANA_ACCOUNT,
      amount: 1000,
      concept: 'Pago de prueba',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      fromAccount: JUAN_ACCOUNT,
      toAccount: ANA_ACCOUNT,
      amount: 1000,
      concept: 'Pago de prueba',
    });
    expect(res.body).toHaveProperty('transactionId');
    expect(res.body).toHaveProperty('createdAt');
  });

  it('CA-08: los saldos se debitan y acreditan correctamente', async () => {
    const token = await loginToken('juan.perez@bancoUP.mx', 'Juan1!');
    await doTransfer(token, { toAccountNumber: ANA_ACCOUNT, amount: 1500, concept: 'Verificación saldos' });

    const juan = await prisma.account.findUnique({ where: { accountNumber: JUAN_ACCOUNT } });
    const ana = await prisma.account.findUnique({ where: { accountNumber: ANA_ACCOUNT } });
    expect(Number(juan!.balance)).toBeCloseTo(9850 - 1500, 2);
    expect(Number(ana!.balance)).toBeCloseTo(25400 + 1500, 2);
  });

  it('sin token de autorización → 401', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .send({ toAccountNumber: ANA_ACCOUNT, amount: 1000, concept: 'Sin auth' });
    expect(res.status).toBe(401);
  });

  it('ADMIN no puede realizar transferencias → 403', async () => {
    const token = await loginToken('admin@bancoUP.mx', 'Admin1!');
    const res = await doTransfer(token, {
      toAccountNumber: ANA_ACCOUNT,
      amount: 1000,
      concept: 'Admin intenta transferir',
    });
    expect(res.status).toBe(403);
  });

  it('cuenta destino inexistente → 404', async () => {
    const token = await loginToken('juan.perez@bancoUP.mx', 'Juan1!');
    const res = await doTransfer(token, {
      toAccountNumber: '9999999999999999',
      amount: 1000,
      concept: 'Destino inexistente',
    });
    expect(res.status).toBe(404);
  });

  it('auto-transferencia → 422', async () => {
    const token = await loginToken('juan.perez@bancoUP.mx', 'Juan1!');
    const res = await doTransfer(token, {
      toAccountNumber: JUAN_ACCOUNT,
      amount: 1000,
      concept: 'Transferencia a mí mismo',
    });
    expect(res.status).toBe(422);
  });

  it('saldo insuficiente → 422', async () => {
    const token = await loginToken('juan.perez@bancoUP.mx', 'Juan1!');
    // Juan tiene $9,850; intentar $9,851
    const res = await doTransfer(token, {
      toAccountNumber: ANA_ACCOUNT,
      amount: 9851,
      concept: 'Más de lo disponible',
    });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/saldo/i);
  });

  it('número de cuenta con formato inválido → 400', async () => {
    const token = await loginToken('juan.perez@bancoUP.mx', 'Juan1!');
    const res = await doTransfer(token, {
      toAccountNumber: '123',
      amount: 1000,
      concept: 'Cuenta con formato inválido',
    });
    expect(res.status).toBe(400);
  });
});

// ── BU-12: Saldo máximo receptor ───────────────────────────────────────────

describe('BU-12 — Saldo máximo en cuenta receptora ($50,000)', () => {
  it('CA-09: transferencia que dejaría al receptor con >$50,000 → 422', async () => {
    // Poner a Ana en $49,600 para que $500 la lleve a $50,100
    await prisma.account.update({
      where: { accountNumber: ANA_ACCOUNT },
      data: { balance: '49600.00' },
    });

    const token = await loginToken('juan.perez@bancoUP.mx', 'Juan1!');
    const res = await doTransfer(token, {
      toAccountNumber: ANA_ACCOUNT,
      amount: 500,
      concept: 'Excede saldo máximo receptor',
    });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/saldo máximo/i);
  });

  it('CA-09: receptor que quedaría exactamente en $50,000 es aceptado', async () => {
    // Ana en $49,500 → $49,500 + $500 = $50,000 exacto
    await prisma.account.update({
      where: { accountNumber: ANA_ACCOUNT },
      data: { balance: '49500.00' },
    });

    const token = await loginToken('juan.perez@bancoUP.mx', 'Juan1!');
    const res = await doTransfer(token, {
      toAccountNumber: ANA_ACCOUNT,
      amount: 500,
      concept: 'Exactamente el límite del receptor',
    });
    expect(res.status).toBe(201);
  });
});

// ── BU-11: Atomicidad / Rollback ──────────────────────────────────────────

describe('BU-11 — Atomicidad de la transacción (CA-10)', () => {
  it('CA-10: cuando una transferencia falla, los saldos no cambian', async () => {
    const juanBefore = await prisma.account.findUnique({ where: { accountNumber: JUAN_ACCOUNT } });
    const anaBefore = await prisma.account.findUnique({ where: { accountNumber: ANA_ACCOUNT } });

    const token = await loginToken('juan.perez@bancoUP.mx', 'Juan1!');
    // Monto < $500 — debe rechazarse antes de tocar los saldos
    const res = await doTransfer(token, {
      toAccountNumber: ANA_ACCOUNT,
      amount: 100,
      concept: 'Falla intencional por monto',
    });
    expect(res.status).toBe(422);

    const juanAfter = await prisma.account.findUnique({ where: { accountNumber: JUAN_ACCOUNT } });
    const anaAfter = await prisma.account.findUnique({ where: { accountNumber: ANA_ACCOUNT } });
    expect(Number(juanAfter!.balance)).toBe(Number(juanBefore!.balance));
    expect(Number(anaAfter!.balance)).toBe(Number(anaBefore!.balance));
  });

  it('CA-10: fallo por saldo insuficiente tampoco modifica ningún saldo', async () => {
    const juanBefore = await prisma.account.findUnique({ where: { accountNumber: JUAN_ACCOUNT } });
    const anaBefore = await prisma.account.findUnique({ where: { accountNumber: ANA_ACCOUNT } });

    const token = await loginToken('juan.perez@bancoUP.mx', 'Juan1!');
    await doTransfer(token, {
      toAccountNumber: ANA_ACCOUNT,
      amount: 9851,
      concept: 'Falla por saldo insuficiente',
    });

    const juanAfter = await prisma.account.findUnique({ where: { accountNumber: JUAN_ACCOUNT } });
    const anaAfter = await prisma.account.findUnique({ where: { accountNumber: ANA_ACCOUNT } });
    expect(Number(juanAfter!.balance)).toBe(Number(juanBefore!.balance));
    expect(Number(anaAfter!.balance)).toBe(Number(anaBefore!.balance));
  });
});
