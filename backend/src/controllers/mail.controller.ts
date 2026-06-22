import { Request, Response, NextFunction } from 'express';
import * as mailService from '../services/mail.service';
import { AppError } from '../middleware/error.middleware';

export async function getConfig(_req: Request, res: Response, next: NextFunction) {
  try {
    const config = await mailService.getConfig();
    res.json(config);
  } catch (error) {
    next(error);
  }
}

export async function updateConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpSecure } = req.body;
    const config = await mailService.updateConfig({
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      smtpSecure,
    });
    res.json(config);
  } catch (error) {
    next(error);
  }
}

export async function sendTestEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { to } = req.body;
    if (!to) {
      throw new AppError(400, 'Email address is required');
    }
    const result = await mailService.sendTestEmail(to);
    res.json({ message: 'Test email sent successfully', ...result });
  } catch (error) {
    next(error);
  }
}

export async function getTemplates(_req: Request, res: Response, next: NextFunction) {
  try {
    const templates = await mailService.getTemplates();
    res.json(templates);
  } catch (error) {
    next(error);
  }
}

export async function getTemplateById(req: Request, res: Response, next: NextFunction) {
  try {
    const template = await mailService.getTemplateById(req.params.id);
    if (!template) {
      throw new AppError(404, 'Template not found');
    }
    res.json(template);
  } catch (error) {
    next(error);
  }
}

export async function updateTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { subject, body } = req.body;
    const template = await mailService.updateTemplate(req.params.id, { subject, body });
    res.json(template);
  } catch (error) {
    next(error);
  }
}
