import client from './client';
import type { ApiResponse, Transaction } from '../types';

/** Usuario tal como lo devuelve la API de administración (sin contraseña). */
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  /** 0 = activa, 1 = bloqueada. */
  is_locked: number;
  created_at: string;
}

/** Cuenta bancaria vista desde el panel de administración. */
export interface AdminAccount {
  id: number;
  user_id: number;
  account_number: string;
  balance: number;
  created_at: string;
}

/** Registro de intento de login con el nombre del usuario si está disponible. */
export interface AdminLoginAttempt {
  id: number;
  /** null si el email no corresponde a ningún usuario registrado. */
  user_id: number | null;
  email: string;
  /** 0 = fallido, 1 = exitoso. */
  success: number;
  ip_address: string | null;
  attempted_at: string;
  user_name: string | null;
}

/** Endpoints del panel de administración (requieren rol 'admin'). */
export const adminApi = {
  /** Lista todos los usuarios del sistema. */
  getUsers: () => client.get<ApiResponse<AdminUser[]>>('/admin/users'),
  /** Detalle de un usuario por ID. */
  getUserById: (id: number) => client.get<ApiResponse<AdminUser>>(`/admin/users/${id}`),
  /** Bloquea la cuenta de un usuario (impide iniciar sesión). */
  lockUser: (id: number) => client.patch(`/admin/users/${id}/lock`),
  /** Desbloquea la cuenta de un usuario. */
  unlockUser: (id: number) => client.patch(`/admin/users/${id}/unlock`),
  /** Lista todas las cuentas bancarias del sistema. */
  getAccounts: () => client.get<ApiResponse<AdminAccount[]>>('/admin/accounts'),
  /** Lista todas las transacciones del sistema. */
  getTransactions: () => client.get<ApiResponse<Transaction[]>>('/admin/transactions'),
  /** Historial global de intentos de login (últimos 200). */
  getLoginAttempts: () => client.get<ApiResponse<AdminLoginAttempt[]>>('/admin/login-attempts'),
  /** Historial de intentos de login de un usuario específico (últimos 100). */
  getLoginAttemptsByUser: (userId: number) =>
    client.get<ApiResponse<AdminLoginAttempt[]>>(`/admin/login-attempts/${userId}`),
};
