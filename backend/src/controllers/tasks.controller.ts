import { Request, Response, NextFunction } from 'express';
import * as tasksService from '../services/tasks.service';
import { TaskStatus, Priority, Recurring } from '@prisma/client';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await tasksService.listTasks(req.userId, {
      status: req.query.status as TaskStatus,
      priority: req.query.priority as Priority,
      categoryId: req.query.categoryId as string,
      search: req.query.search as string,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await tasksService.getTask(req.params.id, req.userId);
    res.json(task);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await tasksService.createTask(req.userId, {
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority as Priority,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      recurring: req.body.recurring as Recurring,
      categoryIds: req.body.categoryIds,
    });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await tasksService.updateTask(req.params.id, req.userId, {
      ...req.body,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
    });
    res.json(task);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await tasksService.deleteTask(req.params.id, req.userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function reorder(req: Request, res: Response, next: NextFunction) {
  try {
    await tasksService.reorderTasks(req.userId, req.body.ids);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
