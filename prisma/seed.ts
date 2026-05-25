import { PrismaClient, TransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BCRYPT_COST = 12;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

async function main() {
  console.log('🌱 Iniciando seed...');

  await prisma.revokedToken.deleteMany();
  await prisma.auditUnlock.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // 1 ADMIN (RF-15)
  await prisma.user.create({
    data: {
      email: 'admin@bancoUP.mx',
      passwordHash: await bcrypt.hash('Admin1!', BCRYPT_COST),
      firstName: 'Admin',
      lastName: 'BancoUP',
      role: 'ADMIN',
    },
  });

  // 3 USUARIOS con cuentas activas (RF-15)
  const users = [
    { email: 'juan.perez@bancoUP.mx',   pass: 'Juan1!', fn: 'Juan',   ln: 'Pérez',    acct: '1234567890123456', bal: '10000.00', finalBal: '9850.00'  },
    { email: 'ana.gonzalez@bancoUP.mx', pass: 'Ana01!', fn: 'Ana',    ln: 'González', acct: '2345678901234567', bal: '25000.00', finalBal: '25400.00' },
    { email: 'carlos.reyes@bancoUP.mx', pass: 'Carl1!', fn: 'Carlos', ln: 'Reyes',    acct: '3456789012345678', bal: '40000.00', finalBal: '39750.00' },
  ] as const;

  const acctIds: Record<string, string> = {};

  for (const u of users) {
    const created = await prisma.user.create({
      data: {
        email: u.email,
        passwordHash: await bcrypt.hash(u.pass, BCRYPT_COST),
        firstName: u.fn,
        lastName: u.ln,
        role: 'USER',
        account: { create: { accountNumber: u.acct, balance: u.bal } },
      },
      include: { account: true },
    });
    acctIds[u.email] = created.account!.id;

    await prisma.transaction.create({
      data: {
        toAccountId: created.account!.id,
        amount: u.bal,
        concept: 'Depósito inicial de apertura',
        type: TransactionType.DEPOSIT,
        createdAt: daysAgo(30),
      },
    });
  }

  const [a1, a2, a3] = [
    acctIds['juan.perez@bancoUP.mx'],
    acctIds['ana.gonzalez@bancoUP.mx'],
    acctIds['carlos.reyes@bancoUP.mx'],
  ];

  // Transferencias históricas — 1 por día para no violar límite diario
  // Juan acumula >10 entradas en historial (habilita CA-12 paginación)
  const transfers = [
    { from: a1, to: a2, amount: '600.00',  concept: 'Pago renta',          n: 25 },
    { from: a1, to: a2, amount: '600.00',  concept: 'Pago servicios',       n: 24 },
    { from: a1, to: a2, amount: '600.00',  concept: 'Deuda pendiente',      n: 23 },
    { from: a2, to: a1, amount: '1800.00', concept: 'Reembolso',            n: 22 },
    { from: a1, to: a3, amount: '700.00',  concept: 'Préstamo',             n: 21 },
    { from: a2, to: a3, amount: '1500.00', concept: 'Inversión compartida', n: 20 },
    { from: a1, to: a2, amount: '500.00',  concept: 'Comida',               n: 19 },
    { from: a3, to: a1, amount: '2000.00', concept: 'Pago deuda',           n: 18 },
    { from: a1, to: a2, amount: '600.00',  concept: 'Gasolina',             n: 17 },
    { from: a2, to: a1, amount: '800.00',  concept: 'Reembolso viaje',      n: 16 },
    { from: a1, to: a3, amount: '550.00',  concept: 'Regalo',               n: 15 },
    { from: a3, to: a2, amount: '1000.00', concept: 'Pago curso',           n: 14 },
    { from: a1, to: a2, amount: '600.00',  concept: 'Cena',                 n: 13 },
  ];

  for (const t of transfers) {
    await prisma.transaction.create({
      data: {
        fromAccountId: t.from,
        toAccountId: t.to,
        amount: t.amount,
        concept: t.concept,
        type: TransactionType.TRANSFER,
        createdAt: daysAgo(t.n),
      },
    });
  }

  // Saldos finales: Juan $9,850 + Ana $25,400 + Carlos $39,750 = $75,000 ✓
  for (const u of users) {
    await prisma.account.update({
      where: { id: acctIds[u.email] },
      data: { balance: u.finalBal },
    });
  }

  console.log('✅ Seed completado');
  console.log('   admin@bancoUP.mx        / Admin1!');
  console.log('   juan.perez@bancoUP.mx   / Juan1!  → 1234567890123456 · $9,850.00');
  console.log('   ana.gonzalez@bancoUP.mx / Ana01!  → 2345678901234567 · $25,400.00');
  console.log('   carlos.reyes@bancoUP.mx / Carl1!  → 3456789012345678 · $39,750.00');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
