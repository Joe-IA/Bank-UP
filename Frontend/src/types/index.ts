export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface UserProfile {
  name: string;
  email: string;
  role: 'user' | 'admin';
  account_number: string | null;
  balance: number | null;
}

export interface Transaction {
  id: number;
  type: 'deposit' | 'transfer';
  amount: number;
  origin_account_id: number;
  destination_account_id: number;
  description: string | null;
  created_at: string;
}

export interface LoginAttempt {
  id: number;
  user_id: number | null;
  success: number;
  ip_address: string | null;
  attempted_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}
