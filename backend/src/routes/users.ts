import { Router } from 'express';
import * as ctrl from '../controllers/users.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/me', ctrl.getProfile);
router.get('/me/stats', ctrl.getStats);
router.put('/me/email', ctrl.updateEmail);
router.put('/me/password', ctrl.updatePassword);
router.delete('/me', ctrl.deleteAccount);

export default router;
