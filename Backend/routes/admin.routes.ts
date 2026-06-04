/**
 * Rutas de administración — requieren JWT con rol 'admin'.
 *
 * Usuarios:
 *   GET    /api/admin/users              — lista todos los usuarios.
 *   GET    /api/admin/users/:id          — detalle de un usuario.
 *   PATCH  /api/admin/users/:id/lock     — bloquea la cuenta.
 *   PATCH  /api/admin/users/:id/unlock   — desbloquea la cuenta.
 *
 * Cuentas:
 *   GET    /api/admin/accounts           — lista todas las cuentas bancarias.
 *
 * Transacciones:
 *   GET    /api/admin/transactions       — lista todas las transacciones del sistema.
 *
 * Auditoría:
 *   GET    /api/admin/login-attempts          — todos los intentos de login.
 *   GET    /api/admin/login-attempts/:userId  — intentos de login de un usuario.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../src/middleware/auth.js';
import {
  getAllUsers,
  getUserById,
  lockUser,
  unlockUser,
  getLoginAttempts,
  getAllLoginAttempts,
} from '../src/services/adminService.js';
import { getAllAccounts } from '../src/services/accountService.js';
import { getAllTransactions } from '../src/services/transactionService.js';

const router = Router();

// Todas las rutas de este router exigen autenticación y rol 'admin'.
router.use(authenticate, authorize('admin'));

// ── Users ─────────────────────────────────────────────────────────────────────

router.get('/users', (_req: Request, res: Response, next: NextFunction): void => {
  try {
    res.json({ success: true, data: getAllUsers() });
  } catch (err) { next(err); }
});

router.get('/users/:id', (req: Request, res: Response, next: NextFunction): void => {
  try {
    res.json({ success: true, data: getUserById(Number(req.params.id)) });
  } catch (err) { next(err); }
});

router.patch('/users/:id/lock', (req: Request, res: Response, next: NextFunction): void => {
  try {
    res.json({ success: true, ...lockUser(Number(req.params.id)) });
  } catch (err) { next(err); }
});

router.patch('/users/:id/unlock', (req: Request, res: Response, next: NextFunction): void => {
  try {
    res.json({ success: true, ...unlockUser(Number(req.params.id)) });
  } catch (err) { next(err); }
});

// ── Accounts ──────────────────────────────────────────────────────────────────

router.get('/accounts', (_req: Request, res: Response, next: NextFunction): void => {
  try {
    res.json({ success: true, data: getAllAccounts() });
  } catch (err) { next(err); }
});

// ── Transactions ──────────────────────────────────────────────────────────────

router.get('/transactions', (_req: Request, res: Response, next: NextFunction): void => {
  try {
    res.json({ success: true, data: getAllTransactions() });
  } catch (err) { next(err); }
});

// ── Login audit ───────────────────────────────────────────────────────────────

router.get('/login-attempts', (_req: Request, res: Response, next: NextFunction): void => {
  try {
    res.json({ success: true, data: getAllLoginAttempts() });
  } catch (err) { next(err); }
});

router.get('/login-attempts/:userId', (req: Request, res: Response, next: NextFunction): void => {
  try {
    res.json({ success: true, data: getLoginAttempts(Number(req.params.userId)) });
  } catch (err) { next(err); }
});

export default router;
