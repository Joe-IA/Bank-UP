import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../lib/errors';
import { JwtPayload, Role } from '../types';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado');
  return secret;
}

export function verifyJWT(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Token de autenticación requerido'));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getSecret()) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    next(new AppError(401, 'Token inválido o expirado'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'No tienes permisos para realizar esta acción'));
    }
    next();
  };
}
