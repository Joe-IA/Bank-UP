import { PrismaClient, TransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_COST = 12;

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10, 0, 0, 0);
  return d;
}

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpia en orden para respetar FK constraints (idempotente)
  await prisma.revokedToken.deleteMany();
  await prisma.auditUnlock.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // ── Administrador (RF-15: ≥1 admin) ────────────────────────────────────────
  await prisma.user.create({
    data: {
      email: 'admin@bancoUP.mx',
      passwordHash: await bcrypt.hash('Admin1!', BCRYPT_COST),
      firstName: 'Admin',
      lastName: 'BancoUP',
      role: 'ADMIN',
    },
  });

  // ── Usuarios con cuentas (RF-15: ≥3 usuarios con cuenta activa) ────────────
  // Balances iniciales: los actualizamos al final según las transferencias del seed
  const seedUsers = [
    {
      email: 'juan.perez@bancoUP.mx',
      password: 'Juan1!',
      firstName: 'Juan',
      lastName: 'Pérez',
      accountNumber: '1234567890123456',
      // Saldo final calculado sobre las 13 transferencias de abajo: $9,850.00
      finalBalance: '9850.00',
    },
    {
      email: 'ana.gonzalez@bancoUP.mx',
      password: 'Ana01!',
      firstName: 'Ana',
      lastName: 'González',
      accountNumber: '2345678901234567',
      // Saldo final: $25,400.00
      finalBalance: '25400.00',
    },
    {
      email: 'carlos.reyes@bancoUP.mx',
      password: 'Carl1!',
      firstName: 'Carlos',
      lastName: 'Reyes',
      accountNumber: '3456789012345678',
      // Saldo final: $39,750.00
      finalBalance: '39750.00',
    },
  ] as const;

  // Créditos iniciales (DEPOSIT) para representar la carga de fondos al abrir cuenta
  const initialDeposits: Record<string, string> = {
    'juan.perez@bancoUP.mx':    '10000.00',
    'ana.gonzalez@bancoUP.mx':  '25000.00',
    'carlos.reyes@bancoUP.mx':  '40000.00',
  };

  const accountIds: Record<string, string> = {};

  for (const u of seedUsers) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        passwordHash: await bcrypt.hash(u.password, BCRYPT_COST),
        firstName: u.firstName,
        lastName: u.lastName,
        role: 'USER',
        account: {
          create: {
            accountNumber: u.accountNumber,
            balance: initialDeposits[u.email],
          },
        },
      },
      include: { account: true },
    });

    const acctId = user.account!.id;
    accountIds[u.email] = acctId;

    // Registra el depósito inicial en el historial (tipo DEPOSIT, sin remitente)
    await prisma.transaction.create({
      data: {
        toAccountId: acctId,
        amount: initialDeposits[u.email],
        concept: 'Depósito inicial de apertura',
        type: TransactionType.DEPOSIT,
        createdAt: daysAgo(30),
      },
    });
  }

  const acc1 = accountIds['juan.perez@bancoUP.mx'];
  const acc2 = accountIds['ana.gonzalez@bancoUP.mx'];
  const acc3 = accountIds['carlos.reyes@bancoUP.mx'];

  // ── Transferencias históricas ──────────────────────────────────────────────
  // Backdateadas (una por día) para no activar el límite diario de $7,000.
  // 13 transferencias → Juan tiene ≥13 entradas en historial (CA-12: paginación >10).
  //
  // Flujo de fondos (verificado):
  //   Juan  envía: 600+600+600+700+500+600+550+600 = $4,750 → recibe: 1800+2000+800 = $4,600
  //   Ana   envía: 1800+1500+800 = $4,100             → recibe: 600+600+600+500+600+1000+600 = $4,500
  //   Carlos envía: 2000+1000 = $3,000                → recibe: 700+1500+550 = $2,750
  //
  //   Saldos finales (total invariante = $75,000):
  //     Juan:   10000 - 4750 + 4600 = $9,850 ✓
  //     Ana:    25000 - 4100 + 4500 = $25,400 ✓
  //     Carlos: 40000 - 3000 + 2750 = $39,750 ✓
  const transfers = [
    { from: acc1, to: acc2, amount: '600.00',  concept: 'Pago renta',            daysAgo: 25 },
    { from: acc1, to: acc2, amount: '600.00',  concept: 'Pago servicios',         daysAgo: 24 },
    { from: acc1, to: acc2, amount: '600.00',  concept: 'Deuda pendiente',        daysAgo: 23 },
    { from: acc2, to: acc1, amount: '1800.00', concept: 'Reembolso',              daysAgo: 22 },
    { from: acc1, to: acc3, amount: '700.00',  concept: 'Préstamo',               daysAgo: 21 },
    { from: acc2, to: acc3, amount: '1500.00', concept: 'Inversión compartida',   daysAgo: 20 },
    { from: acc1, to: acc2, amount: '500.00',  concept: 'Comida',                 daysAgo: 19 },
    { from: acc3, to: acc1, amount: '2000.00', concept: 'Pago deuda',             daysAgo: 18 },
    { from: acc1, to: acc2, amount: '600.00',  concept: 'Gasolina',               daysAgo: 17 },
    { from: acc2, to: acc1, amount: '800.00',  concept: 'Reembolso viaje',        daysAgo: 16 },
    { from: acc1, to: acc3, amount: '550.00',  concept: 'Regalo',                 daysAgo: 15 },
    { from: acc3, to: acc2, amount: '1000.00', concept: 'Pago curso',             daysAgo: 14 },
    { from: acc1, to: acc2, amount: '600.00',  concept: 'Cena',                   daysAgo: 13 },
  ];

  for (const t of transfers) {
    await prisma.transaction.create({
      data: {
        fromAccountId: t.from,
        toAccountId: t.to,
        amount: t.amount,
        concept: t.concept,
        type: TransactionType.TRANSFER,
        createdAt: daysAgo(t.daysAgo),
      },
    });
  }

  // Actualiza saldos finales (refleja el estado real tras todas las transferencias)
  await prisma.account.update({ where: { id: acc1 }, data: { balance: '9850.00' } });
  await prisma.account.update({ where: { id: acc2 }, data: { balance: '25400.00' } });
  await prisma.account.update({ where: { id: acc3 }, data: { balance: '39750.00' } });

  console.log('\n✅ Seed completado exitosamente');
  console.log('──────────────────────────────────────────');
  console.log('  ADMIN:');
  console.log('    admin@bancoUP.mx        / Admin1!');
  console.log('  USUARIOS:');
  console.log('    juan.perez@bancoUP.mx   / Juan1!  → Cuenta 1234567890123456 · $9,850.00');
  console.log('    ana.gonzalez@bancoUP.mx / Ana01!  → Cuenta 2345678901234567 · $25,400.00');
  console.log('    carlos.reyes@bancoUP.mx / Carl1!  → Cuenta 3456789012345678 · $39,750.00');
  console.log('──────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
