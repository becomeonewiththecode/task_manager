import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/taskTemplates.service';
import { Priority, Recurring } from '@prisma/client';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.listTemplates(req.userId));
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await svc.createTemplate(req.userId, {
      name: req.body.name,
      description: req.body.description,
      priority: req.body.priority as Priority,
      recurring: req.body.recurring as Recurring,
      categoryIds: req.body.categoryIds,
    }));
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.updateTemplate(req.params.id, req.userId, req.body));
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteTemplate(req.params.id, req.userId);
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function apply(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await svc.applyTemplate(req.params.id, req.userId, {
      title: req.body.title,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
    });
    res.status(201).json(task);
  } catch (err) { next(err); }
}
