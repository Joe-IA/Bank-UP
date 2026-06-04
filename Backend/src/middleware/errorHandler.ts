import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

/**
 * Manejador centralizado de errores (debe registrarse último en Express).
 *
 * - AppError: error esperado de negocio → devuelve su statusCode y mensaje.
 * - Cualquier otro error: se loguea internamente y responde 500 sin detalles,
 *   evitando filtrar información sensible del servidor al cliente.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  console.error('[ERROR]', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}
