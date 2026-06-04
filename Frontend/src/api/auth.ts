import client from './client';
import type { ApiResponse, User } from '../types';

/** Respuesta del endpoint de login: token JWT + datos públicos del usuario. */
export interface LoginResult {
  token: string;
  user: User;
}

/** Funciones de autenticación (rutas públicas, no requieren token). */
export const authApi = {
  /** Inicia sesión y devuelve un JWT junto con los datos del usuario. */
  login: (email: string, password: string) =>
    client.post<ApiResponse<LoginResult>>('/auth/login', { email, password }),

  /** Registra un nuevo usuario. Si el rol es 'user' se crea su cuenta bancaria. */
  register: (name: string, email: string, password: string, role?: 'user' | 'admin') =>
    client.post<ApiResponse<User>>('/auth/register', { name, email, password, role }),
};
