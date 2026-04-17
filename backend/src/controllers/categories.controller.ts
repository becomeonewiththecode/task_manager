import { Request, Response, NextFunction } from 'express';
import * as categoriesService from '../services/categories.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await categoriesService.listCategories(req.userId));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const cat = await categoriesService.createCategory(req.userId, req.body.name, req.body.color ?? '#6366f1');
    res.status(201).json(cat);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await categoriesService.updateCategory(req.params.id, req.userId, req.body.name, req.body.color));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await categoriesService.deleteCategory(req.params.id, req.userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
