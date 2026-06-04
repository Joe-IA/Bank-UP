import { validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware que recoge los errores generados por las cadenas de express-validator
 * definidas en cada ruta. Si hay alguno, responde 400 con la lista de errores;
 * si no, cede el control al siguiente handler.
 */
export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  next();
}
