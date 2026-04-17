import { Request, Response, NextFunction } from 'express';
import * as usersService from '../services/users.service';

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await usersService.getProfile(req.userId));
  } catch (err) {
    next(err);
  }
}

export async function updateEmail(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await usersService.updateEmail(req.userId, req.body.email, req.body.password));
  } catch (err) {
    next(err);
  }
}

export async function updatePassword(req: Request, res: Response, next: NextFunction) {
  try {
    await usersService.updatePassword(req.userId, req.body.currentPassword, req.body.newPassword);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    await usersService.deleteAccount(req.userId, req.body.password);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await usersService.getStats(req.userId));
  } catch (err) {
    next(err);
  }
}
