import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../src/middleware/auth.js';
import { getUserProfile } from '../src/services/accountService.js';

const router = Router();

// GET /api/accounts/me
router.get(
  '/me',
  authenticate,
  authorize('user', 'admin'),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const account = getUserProfile(req.user!.id);
      res.json({ success: true, data: account });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
