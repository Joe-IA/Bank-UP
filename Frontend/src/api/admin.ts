import client from './client';
import type { ApiResponse, User, Transaction, LoginAttempt } from '../types';

interface AccountRow {
  id: number;
  user_id: number;
  account_number: string;
  balance: number;
  created_at: string;
}

export const adminApi = {
  getUsers: () => client.get<ApiResponse<User[]>>('/admin/users'),
  getUserById: (id: number) => client.get<ApiResponse<User>>(`/admin/users/${id}`),
  lockUser: (id: number) => client.patch(`/admin/users/${id}/lock`),
  unlockUser: (id: number) => client.patch(`/admin/users/${id}/unlock`),
  getAccounts: () => client.get<ApiResponse<AccountRow[]>>('/admin/accounts'),
  getTransactions: () => client.get<ApiResponse<Transaction[]>>('/admin/transactions'),
  getLoginAttempts: () => client.get<ApiResponse<LoginAttempt[]>>('/admin/login-attempts'),
  getLoginAttemptsByUser: (userId: number) =>
    client.get<ApiResponse<LoginAttempt[]>>(`/admin/login-attempts/${userId}`),
};
