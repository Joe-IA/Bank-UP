import client from './client';
import type { ApiResponse, Transaction, UserProfile } from '../types';

/** Transacción enriquecida con los números de cuenta legibles (origen y destino). */
export interface TransactionWithAccounts extends Transaction {
  /** null en depósitos (no hay cuenta origen). */
  origin_account_number: string | null;
  destination_account_number: string | null;
}

/**
 * API del usuario regular — combina perfil y operaciones bancarias en un solo objeto
 * para simplificar las importaciones en los componentes.
 */
export const userApi = {
  /** Perfil del usuario autenticado: nombre, email, número de cuenta y saldo. */
  getProfile: () => client.get<ApiResponse<UserProfile>>('/accounts/me'),
  /** Historial de transacciones del usuario con números de cuenta incluidos. */
  getTransactions: () => client.get<ApiResponse<TransactionWithAccounts[]>>('/transactions'),
  /** Deposita `amount` en la cuenta propia. */
  deposit: (amount: number, description?: string) =>
    client.post<ApiResponse<Transaction>>('/transactions/deposit', { amount, description }),
  /** Transfiere `amount` a la cuenta `destinationAccountNumber`. */
  transfer: (destinationAccountNumber: string, amount: number, description?: string) =>
    client.post<ApiResponse<Transaction>>('/transactions/transfer', {
      destinationAccountNumber,
      amount,
      description,
    }),
};
