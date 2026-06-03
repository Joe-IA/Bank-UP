import client from './client';
import type { ApiResponse, Transaction } from '../types';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  is_locked: number;
  created_at: string;
}

export interface AdminAccount {
  id: number;
  user_id: number;
  account_number: string;
  balance: number;
  created_at: string;
}

export interface AdminLoginAttempt {
  id: number;
  user_id: number | null;
  email: string;
  success: number;
  ip_address: string | null;
  attempted_at: string;
  user_name: string | null;
}

export const adminApi = {
  getUsers: () => client.get<ApiResponse<AdminUser[]>>('/admin/users'),
  getUserById: (id: number) => client.get<ApiResponse<AdminUser>>(`/admin/users/${id}`),
  lockUser: (id: number) => client.patch(`/admin/users/${id}/lock`),
  unlockUser: (id: number) => client.patch(`/admin/users/${id}/unlock`),
  getAccounts: () => client.get<ApiResponse<AdminAccount[]>>('/admin/accounts'),
  getTransactions: () => client.get<ApiResponse<Transaction[]>>('/admin/transactions'),
  getLoginAttempts: () => client.get<ApiResponse<AdminLoginAttempt[]>>('/admin/login-attempts'),
  getLoginAttemptsByUser: (userId: number) =>
    client.get<ApiResponse<AdminLoginAttempt[]>>(`/admin/login-attempts/${userId}`),
};
