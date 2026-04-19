import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/timeEntries.service';

export async function start(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await svc.startTimer(req.params.taskId, req.userId));
  } catch (err) { next(err); }
}

export async function stop(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.stopTimer(req.params.entryId, req.userId));
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.listEntries(req.params.taskId, req.userId));
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteEntry(req.params.entryId, req.userId);
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function total(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getTotalTime(req.params.taskId, req.userId));
  } catch (err) { next(err); }
}

export async function active(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getActiveTimer(req.userId));
  } catch (err) { next(err); }
}
