/** Fila completa de la tabla `users`, incluyendo el hash de contraseña. */
export interface UserRow {
    id: number;
    name: string;
    email: string;
    /** Hash bcrypt — nunca exponer en respuestas de la API. */
    password: string;
    role: "user" | "admin";
    /** 0 = activa, 1 = bloqueada. SQLite no tiene tipo booleano nativo. */
    is_locked: number;
    created_at: string;
    updated_at: String;
}

/** Fila completa de la tabla `accounts`. */
export interface AccountRow {
    id: number;
    user_id: number;
    account_number: string;
    balance: number;
    created_at: string;
    updated_at: string;
}

/** Fila completa de la tabla `transactions`. */
export interface TransactionRow {
    id: number;
    type: "deposit" | "transfer";
    amount: number;
    /** NULL en depósitos (no hay cuenta origen). */
    origin_account_id: number;
    destination_account_id: number;
    description: string | null;
    created_at: string;
}

/** Fila completa de la tabla `login_attempts`. */
export interface LoginAttemptRow {
    id: number;
    /** NULL si el email no corresponde a ningún usuario registrado. */
    user_id: number | null;
    /** 0 = fallido, 1 = exitoso. */
    success: number;
    ip_address: string | null;
    attemped_at: string;
}

/** Perfil público del usuario autenticado, incluyendo datos de su cuenta. */
export interface UserProfile {
  name: string;
  email: string;
  role: 'user' | 'admin';
  /** NULL si el usuario tiene rol admin (no se crea cuenta bancaria para admins). */
  account_number: string | null;
  balance: number | null;
}