import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.post('/totp/setup', authenticate, ctrl.setupTotp);
router.post('/totp/enable', authenticate, ctrl.enableTotp);
router.post('/totp/disable', authenticate, ctrl.disableTotp);

export default router;
