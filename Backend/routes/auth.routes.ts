import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { validate } from '../src/middleware/validate.js';
import { authorize } from '../src/middleware/auth.js';
import { register, login } from '../src/services/authService.js';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
  ],
  validate,
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = register(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = login({
        email: req.body.email,
        password: req.body.password,
        ipAddress: req.ip,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
