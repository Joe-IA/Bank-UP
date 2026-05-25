import { Router } from 'express';
import authRouter from './auth.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Bank-UP API', timestamp: new Date().toISOString() });
});

router.use('/auth', authRouter);

// Próximas rutas (se montan cuando sus tickets estén implementados):
// router.use('/transfers', transferRouter);   // BU-8,9,11,12
// router.use('/accounts', accountRouter);     // BU-14
// router.use('/admin', adminRouter);          // BU-21

export default router;
