import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';
import { config } from '../config';

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const userEmail = (req as any).userEmail;

  if (!userEmail) {
    return next(new AppError(401, 'Authentication required'));
  }

  const adminEmails = config.ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase());

  if (!adminEmails.includes(userEmail.toLowerCase())) {
    return next(new AppError(403, 'Admin access required'));
  }

  next();
}
