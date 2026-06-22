import { Router } from 'express';
import authRoutes from './auth';
import tasksRoutes from './tasks';
import usersRoutes from './users';
import categoriesRoutes from './categories';
import taskTemplatesRoutes from './taskTemplates';
import pushRoutes from './push';
import adminRoutes from './admin';
import mailRoutes from './mail';
import { getPublic } from '../controllers/taskShares.controller';

const router = Router();

// Public share route — no authenticate middleware
router.get('/share/:token', getPublic);

router.use('/auth', authRoutes);
router.use('/tasks', tasksRoutes);
router.use('/users', usersRoutes);
router.use('/categories', categoriesRoutes);
router.use('/templates', taskTemplatesRoutes);
router.use('/push', pushRoutes);
router.use('/admin', adminRoutes);
router.use('/mail', mailRoutes);

export default router;
