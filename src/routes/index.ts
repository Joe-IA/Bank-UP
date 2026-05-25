import { Router, Request, Response } from 'express';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'Bank-UP API', timestamp: new Date().toISOString() });
});

// Routes will be mounted here as tickets are implemented:
// router.use('/auth', authRouter);
// router.use('/transfers', transferRouter);
// router.use('/accounts', accountRouter);
// router.use('/admin', adminRouter);

export default router;
