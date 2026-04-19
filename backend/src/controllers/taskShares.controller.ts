import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/taskShares.service';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : undefined;
    res.status(201).json(await svc.createShare(req.params.taskId, req.userId, expiresAt));
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.listShares(req.params.taskId, req.userId));
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteShare(req.params.shareId, req.userId);
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function getPublic(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getShareByToken(req.params.token));
  } catch (err) { next(err); }
}
