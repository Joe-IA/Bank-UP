/** Datos públicos del usuario (sin contraseña ni hash). */
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

/** Perfil del usuario autenticado, incluyendo datos de su cuenta bancaria. */
export interface UserProfile {
  name: string;
  email: string;
  role: 'user' | 'admin';
  /** null si el usuario es administrador (los admins no tienen cuenta bancaria). */
  account_number: string | null;
  balance: number | null;
}

/** Representa un movimiento bancario (depósito o transferencia). */
export interface Transaction {
  id: number;
  type: 'deposit' | 'transfer';
  amount: number;
  /** null en depósitos (sin cuenta origen). */
  origin_account_id: number;
  destination_account_id: number;
  description: string | null;
  created_at: string;
}

/** Registro de auditoría de un intento de inicio de sesión. */
export interface LoginAttempt {
  id: number;
  /** null si el email no corresponde a ningún usuario registrado. */
  user_id: number | null;
  /** 0 = fallido, 1 = exitoso. */
  success: number;
  ip_address: string | null;
  attempted_at: string;
}

/** Envelope estándar de todas las respuestas del API. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}
