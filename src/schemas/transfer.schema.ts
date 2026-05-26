import { z } from 'zod';
import { accountNumberSchema, moneyAmountSchema } from './common';

export const transferSchema = z.object({
  toAccountNumber: accountNumberSchema,
  amount: moneyAmountSchema,
  concept: z
    .string()
    .min(1, 'El concepto es requerido')
    .max(200, 'El concepto no puede exceder 200 caracteres'),
});

export type TransferDto = z.infer<typeof transferSchema>;
