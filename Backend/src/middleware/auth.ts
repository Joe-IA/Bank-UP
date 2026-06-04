import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

// Extiende el tipo Request de Express para incluir el usuario autenticado.
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; role: 'user' | 'admin' };
    }
  }
}

/**
 * Middleware de autenticación.
 * Lee el JWT del header Authorization (Bearer <token>), lo verifica
 * y adjunta el payload a req.user para que los handlers posteriores lo usen.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError('No token provided', 401));
    return;
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}

/**
 * Middleware de autorización por rol.
 * Retorna un middleware que permite el paso solo si req.user.role
 * está entre los roles aceptados; de lo contrario responde 403.
 *
 * @example router.get('/admin/users', authenticate, authorize('admin'), handler)
 */
export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError('Forbidden', 403));
      return;
    }
    next();
  };
}
