import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

// BU-8: monto mínimo de transferencia
const MIN_TRANSFER_AMOUNT = 500;
// BU-9: límite diario de transferencias por usuario
const MAX_DAILY_AMOUNT = 7000;
// BU-12: saldo máximo permitido en cuenta receptora
const MAX_BALANCE = 50000;

export async function transfer(
  fromUserId: string,
  toAccountNumber: string,
  amount: number,
  concept: string,
) {
  if (amount < MIN_TRANSFER_AMOUNT) {
    throw new AppError(422, `El monto mínimo de transferencia es $${MIN_TRANSFER_AMOUNT.toFixed(2)}`);
  }

  return prisma.$transaction(
    async (tx) => {
      const fromAccount = await tx.account.findUnique({ where: { userId: fromUserId } });
      if (!fromAccount) throw new AppError(404, 'Cuenta de origen no encontrada');

      const toAccount = await tx.account.findUnique({ where: { accountNumber: toAccountNumber } });
      if (!toAccount) throw new AppError(404, 'Cuenta destino no encontrada');

      if (fromAccount.id === toAccount.id) {
        throw new AppError(422, 'No puedes transferirte fondos a ti mismo');
      }

      const fromBalance = Number(fromAccount.balance);
      if (fromBalance < amount) {
        throw new AppError(422, 'Saldo insuficiente para realizar la transferencia');
      }

      // BU-9: límite diario $7,000
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const dailyAgg = await tx.transaction.aggregate({
        where: {
          fromAccountId: fromAccount.id,
          type: 'TRANSFER',
          createdAt: { gte: todayStart },
        },
        _sum: { amount: true },
      });
      const dailyUsed = Number(dailyAgg._sum.amount ?? 0);
      if (dailyUsed + amount > MAX_DAILY_AMOUNT) {
        throw new AppError(
          422,
          `Límite diario de transferencias ($${MAX_DAILY_AMOUNT.toFixed(2)}) excedido`,
        );
      }

      // BU-12: saldo máximo receptor $50,000
      const toBalance = Number(toAccount.balance);
      if (toBalance + amount > MAX_BALANCE) {
        throw new AppError(
          422,
          `La transferencia excede el saldo máximo permitido ($${MAX_BALANCE.toFixed(2)}) en la cuenta destino`,
        );
      }

      const amountDecimal = new Prisma.Decimal(amount);

      await tx.account.update({
        where: { id: fromAccount.id },
        data: { balance: { decrement: amountDecimal } },
      });

      await tx.account.update({
        where: { id: toAccount.id },
        data: { balance: { increment: amountDecimal } },
      });

      const txRecord = await tx.transaction.create({
        data: {
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id,
          amount: amountDecimal,
          concept,
          type: 'TRANSFER',
        },
      });

      return {
        transactionId: txRecord.id,
        fromAccount: fromAccount.accountNumber,
        toAccount: toAccountNumber,
        amount,
        concept,
        createdAt: txRecord.createdAt,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
