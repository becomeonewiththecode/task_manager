import { Router } from 'express';
import * as ctrl from '../controllers/users.controller';
import * as teCtrl from '../controllers/timeEntries.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/me', ctrl.getProfile);
router.get('/me/stats', ctrl.getStats);
router.get('/me/analytics', ctrl.getAnalytics);
router.get('/me/activity', ctrl.getActivity);
router.get('/me/export', ctrl.exportData);
router.post('/me/import', ctrl.importData);
router.get('/me/active-timer', teCtrl.active);
router.put('/me/email', ctrl.updateEmail);
router.put('/me/password', ctrl.updatePassword);
router.delete('/me', ctrl.deleteAccount);

export default router;
