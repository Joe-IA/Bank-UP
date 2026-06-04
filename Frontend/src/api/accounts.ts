import client from './client';
import type { ApiResponse, UserProfile } from '../types';

/** Endpoints de la cuenta bancaria del usuario autenticado. */
export const accountsApi = {
  /** Devuelve el perfil del usuario: nombre, email, número de cuenta y saldo. */
  getMe: () => client.get<ApiResponse<UserProfile>>('/accounts/me'),
};
