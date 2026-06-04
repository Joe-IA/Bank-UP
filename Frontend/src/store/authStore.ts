import { create } from 'zustand';
import type { User } from '../types';

/** Estado global de autenticación. */
interface AuthState {
  user: User | null;
  token: string | null;
  /** Guarda el token en localStorage y actualiza el store tras un login exitoso. */
  setAuth: (user: User, token: string) => void;
  /** Elimina el token de localStorage y limpia el store al cerrar sesión. */
  clearAuth: () => void;
}

/**
 * Store de Zustand para la sesión del usuario.
 * El token se persiste en localStorage para sobrevivir recargas de página;
 * el objeto `user` se hidrata desde la API al volver a entrar.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  // Inicializa el token desde localStorage para mantener la sesión activa al recargar.
  token: localStorage.getItem('token'),

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token });
  },

  clearAuth: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
}));
