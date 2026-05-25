import { Router } from 'express';
import { validate } from '../middleware/validate';
import { verifyJWT } from '../middleware/auth';
import { loginSchema } from '../schemas/auth.schema';
import { login, logout } from '../services/auth.service';

const router = Router();

// BU-5/BU-6: login → JWT sin expiración
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await login(req.body.email, req.body.password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// BU-7: logout → revoca el token en BD
router.post('/logout', verifyJWT, async (req, res, next) => {
  try {
    await logout(req.user!.jti);
    res.status(200).json({ message: 'Sesión cerrada exitosamente' });
  } catch (err) {
    next(err);
  }
});

export default router;
