import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, username, password } = req.body;
    const user = await authService.register(email, username, password);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function adminLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, totpCode } = req.body;
    const tokens = await authService.adminLogin(email, password, totpCode);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, totpCode } = req.body;
    const tokens = await authService.login(email, password, totpCode);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refresh(refreshToken);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function setupTotp(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.setupTotp(req.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function enableTotp(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.enableTotp(req.userId, req.body.code);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function disableTotp(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.disableTotp(req.userId, req.body.code);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
