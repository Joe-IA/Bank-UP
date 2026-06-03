import client from './client';
import type { ApiResponse, UserProfile } from '../types';

export const accountsApi = {
  getMe: () => client.get<ApiResponse<UserProfile>>('/accounts/me'),
};
