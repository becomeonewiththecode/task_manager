import { Router } from 'express';
import authRoutes from './auth';
import tasksRoutes from './tasks';
import usersRoutes from './users';
import categoriesRoutes from './categories';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tasks', tasksRoutes);
router.use('/users', usersRoutes);
router.use('/categories', categoriesRoutes);

export default router;
