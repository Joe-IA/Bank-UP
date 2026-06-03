import client from './client';
import type { ApiResponse, Transaction } from '../types';

export const transactionsApi = {
  getHistory: () =>
    client.get<ApiResponse<Transaction[]>>('/transactions'),

  deposit: (amount: number, description?: string) =>
    client.post<ApiResponse<Transaction>>('/transactions/deposit', { amount, description }),

  transfer: (destinationAccountNumber: string, amount: number, description?: string) =>
    client.post<ApiResponse<Transaction>>('/transactions/transfer', {
      destinationAccountNumber,
      amount,
      description,
    }),
};
