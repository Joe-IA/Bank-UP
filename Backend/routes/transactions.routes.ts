import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../src/middleware/auth.js';
import { validate } from '../src/middleware/validate.js';
import { deposit, transfer, getTransactionHistory } from '../src/services/transactionService.js';

const router = Router();

// All transaction routes require auth + user role
router.use(authenticate, authorize('user'));

// GET /api/transactions
router.get('/', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const history = getTransactionHistory(req.user!.id);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

// POST /api/transactions/deposit
router.post(
  '/deposit',
  [
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
    body('description').optional().isString().trim(),
  ],
  validate,
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const tx = deposit({
        userId: req.user!.id,
        amount: parseFloat(req.body.amount),
        description: req.body.description,
      });
      res.status(201).json({ success: true, data: tx });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/transactions/transfer
router.post(
  '/transfer',
  [
    body('destinationAccountNumber').notEmpty().withMessage('Destination account number is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
    body('description').optional().isString().trim(),
  ],
  validate,
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const tx = transfer({
        userId: req.user!.id,
        destinationAccountNumber: req.body.destinationAccountNumber,
        amount: parseFloat(req.body.amount),
        description: req.body.description,
      });
      res.status(201).json({ success: true, data: tx });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
