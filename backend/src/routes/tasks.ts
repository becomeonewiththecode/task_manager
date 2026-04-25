import { Router } from 'express';
import * as ctrl from '../controllers/tasks.controller';
import * as teCtrl from '../controllers/timeEntries.controller';
import * as shareCtrl from '../controllers/taskShares.controller';
import * as rcCtrl from '../controllers/recurringCompletions.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Bulk ops first to avoid treating 'bulk' as an :id
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/reorder', ctrl.reorder);
router.get('/:id', ctrl.get);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

// Subtasks
router.post('/:id/subtasks', ctrl.createSubtask);

// Dependencies
router.post('/:id/dependencies', ctrl.addDependency);
router.delete('/:id/dependencies/:dependsOnId', ctrl.removeDependency);

// Time entries
router.post('/:taskId/time-entries', teCtrl.start);
router.patch('/:taskId/time-entries/:entryId/stop', teCtrl.stop);
router.get('/:taskId/time-entries/total', teCtrl.total);
router.get('/:taskId/time-entries', teCtrl.list);
router.delete('/:taskId/time-entries/:entryId', teCtrl.remove);

// Recurring occurrence completions
router.post('/:id/occurrences/:date/toggle', rcCtrl.toggle);

// Shares
router.post('/:taskId/shares', shareCtrl.create);
router.get('/:taskId/shares', shareCtrl.list);
router.delete('/:taskId/shares/:shareId', shareCtrl.remove);

export default router;
