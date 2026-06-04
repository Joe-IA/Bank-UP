import client from './client';
import type { ApiResponse, Transaction } from '../types';

/** Endpoints de transacciones del usuario autenticado (requieren rol 'user'). */
export const transactionsApi = {
  /** Historial completo de depósitos y transferencias del usuario. */
  getHistory: () =>
    client.get<ApiResponse<Transaction[]>>('/transactions'),

  /** Deposita `amount` en la cuenta propia. */
  deposit: (amount: number, description?: string) =>
    client.post<ApiResponse<Transaction>>('/transactions/deposit', { amount, description }),

  /** Transfiere `amount` a la cuenta identificada por `destinationAccountNumber`. */
  transfer: (destinationAccountNumber: string, amount: number, description?: string) =>
    client.post<ApiResponse<Transaction>>('/transactions/transfer', {
      destinationAccountNumber,
      amount,
      description,
    }),
};
