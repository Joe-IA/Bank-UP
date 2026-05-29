export interface UserRow {
    id: number;
    name: string;
    email: string;
    password: string;
    role: "user" | "admin";
    is_locked: number;
    created_at: string;
    updated_at: String;
}

export interface AccountRow {
    id: number;
    user_id: number;
    account_number: string;
    balance: number;
    created_at: string;
    updated_at: string;
}

export interface TransactionRow {
    id: number;
    type: "deposit" | "transfer";
    amount: number;
    origin_account_id: number;
    destination_account_id: number;
    description: string | null;
    created_at: string;
}

export interface LoginAttemptRow {
    id: number;
    user_id: number | null;
    success: number;
    ip_address: string | null;
    attemped_at: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: 'user' | 'admin';
  account_number: string | null;
  balance: number | null;
}