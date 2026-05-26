import { Router } from 'express';
import authRouter from './auth.routes';
import transferRouter from './transfer.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Bank-UP API', timestamp: new Date().toISOString() });
});

router.use('/auth', authRouter);
router.use('/transfers', transferRouter); // BU-8,9,11,12

// Próximas rutas (se montan cuando sus tickets estén implementados):
// router.use('/accounts', accountRouter);     // BU-14
// router.use('/admin', adminRouter);          // BU-21

export default router;
