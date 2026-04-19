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

export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const to = req.query.to ? new Date(req.query.to as string) : new Date();
    const from = req.query.from
      ? new Date(req.query.from as string)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    res.json(await usersService.getAnalytics(req.userId, from, to));
  } catch (err) {
    next(err);
  }
}

export async function exportData(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await usersService.exportData(req.userId));
  } catch (err) {
    next(err);
  }
}

export async function importData(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await usersService.importData(req.userId, req.body));
  } catch (err) {
    next(err);
  }
}

export async function getActivity(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(
      await usersService.getAuditLog(req.userId, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        entity: req.query.entity as string | undefined,
      }),
    );
  } catch (err) {
    next(err);
  }
}
