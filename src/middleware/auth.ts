import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { JwtPayload, Role } from '../types';

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET no configurado');
  return s;
}

export async function verifyJWT(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Token de autenticación requerido'));
  }

  const token = header.slice(7);
  let payload: JwtPayload;

  try {
    payload = jwt.verify(token, getSecret()) as JwtPayload;
  } catch {
    return next(new AppError(401, 'Token inválido'));
  }

  // BU-7: rechaza tokens revocados por logout
  const revoked = await prisma.revokedToken.findUnique({ where: { jti: payload.jti } });
  if (revoked) return next(new AppError(401, 'Sesión cerrada. Inicia sesión nuevamente.'));

  req.user = payload;
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'No tienes permisos para realizar esta acción'));
    }
    next();
  };
}
