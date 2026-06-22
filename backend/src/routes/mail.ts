import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import * as mailController from '../controllers/mail.controller';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/config', mailController.getConfig);
router.put('/config', mailController.updateConfig);
router.post('/test', mailController.sendTestEmail);

router.get('/templates', mailController.getTemplates);
router.get('/templates/:id', mailController.getTemplateById);
router.put('/templates/:id', mailController.updateTemplate);

export default router;
