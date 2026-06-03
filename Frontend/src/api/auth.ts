import client from './client';
import type { ApiResponse, User } from '../types';

export interface LoginResult {
  token: string;
  user: User;
}

export const authApi = {
  login: (email: string, password: string) =>
    client.post<ApiResponse<LoginResult>>('/auth/login', { email, password }),

  register: (name: string, email: string, password: string, role?: 'user' | 'admin') =>
    client.post<ApiResponse<User>>('/auth/register', { name, email, password, role }),
};
