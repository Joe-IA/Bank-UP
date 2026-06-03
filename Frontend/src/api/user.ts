import client from './client';
import type { ApiResponse, Transaction, UserProfile } from '../types';

export interface TransactionWithAccounts extends Transaction {
  origin_account_number: string | null;
  destination_account_number: string | null;
}

export const userApi = {
  getProfile: () => client.get<ApiResponse<UserProfile>>('/accounts/me'),
  getTransactions: () => client.get<ApiResponse<TransactionWithAccounts[]>>('/transactions'),
  deposit: (amount: number, description?: string) =>
    client.post<ApiResponse<Transaction>>('/transactions/deposit', { amount, description }),
  transfer: (destinationAccountNumber: string, amount: number, description?: string) =>
    client.post<ApiResponse<Transaction>>('/transactions/transfer', {
      destinationAccountNumber,
      amount,
      description,
    }),
};
