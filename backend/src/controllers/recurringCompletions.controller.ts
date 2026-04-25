import { Request, Response, NextFunction } from 'express';
import * as service from '../services/recurringCompletions.service';

export async function toggle(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.toggleOccurrence(req.params.id, req.userId, req.params.date);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
