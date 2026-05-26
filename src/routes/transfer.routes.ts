import { Router } from 'express';
import { validate } from '../middleware/validate';
import { verifyJWT, requireRole } from '../middleware/auth';
import { transferSchema } from '../schemas/transfer.schema';
import { transfer } from '../services/transfer.service';

const router = Router();

// BU-8,9,11,12: transferencia entre cuentas — solo USER autenticado
router.post('/', verifyJWT, requireRole('USER'), validate(transferSchema), async (req, res, next) => {
  try {
    const { toAccountNumber, amount, concept } = req.body as {
      toAccountNumber: string;
      amount: number;
      concept: string;
    };
    const result = await transfer(req.user!.sub, toAccountNumber, amount, concept);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
