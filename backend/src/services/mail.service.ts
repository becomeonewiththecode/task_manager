import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const config = await prisma.mailConfig.findUnique({
    where: { id: 'default' },
  });

  if (!config || !config.smtpHost || !config.smtpUser || !config.smtpPass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  return transporter;
}

export async function getConfig() {
  const config = await prisma.mailConfig.findUnique({
    where: { id: 'default' },
  });

  if (!config) {
    return {
      smtpHost: null,
      smtpPort: 587,
      smtpUser: null,
      smtpPass: null,
      smtpFrom: null,
      smtpSecure: false,
    };
  }

  return {
    ...config,
    smtpPass: config.smtpPass ? '••••••••' : null,
  };
}

export async function updateConfig(data: {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  smtpSecure?: boolean;
}) {
  const config = await prisma.mailConfig.upsert({
    where: { id: 'default' },
    update: data,
    create: {
      id: 'default',
      ...data,
    },
  });

  transporter = null;

  return {
    ...config,
    smtpPass: config.smtpPass ? '••••••••' : null,
  };
}

export async function sendTestEmail(to: string) {
  const transport = await getTransporter();
  if (!transport) {
    throw new Error('SMTP not configured. Please configure email settings first.');
  }

  const config = await prisma.mailConfig.findUnique({
    where: { id: 'default' },
  });

  const info = await transport.sendMail({
    from: config?.smtpFrom || config?.smtpUser || 'noreply@taskmanager.local',
    to,
    subject: 'Task Manager - Test Email',
    html: `
      <h1>Email Configuration Test</h1>
      <p>This is a test email from Task Manager.</p>
      <p>If you received this email, your SMTP configuration is working correctly.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">Sent at ${new Date().toISOString()}</p>
    `,
  });

  logger.info({ messageId: info.messageId }, 'Test email sent');

  return { messageId: info.messageId };
}

export async function sendEmail(to: string, subject: string, html: string) {
  const transport = await getTransporter();
  if (!transport) {
    throw new Error('SMTP not configured');
  }

  const config = await prisma.mailConfig.findUnique({
    where: { id: 'default' },
  });

  const info = await transport.sendMail({
    from: config?.smtpFrom || config?.smtpUser || 'noreply@taskmanager.local',
    to,
    subject,
    html,
  });

  logger.info({ messageId: info.messageId, to, subject }, 'Email sent');

  return { messageId: info.messageId };
}

export async function getTemplates() {
  return prisma.mailTemplate.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function getTemplateById(id: string) {
  return prisma.mailTemplate.findUnique({
    where: { id },
  });
}

export async function updateTemplate(id: string, data: { subject?: string; body?: string }) {
  return prisma.mailTemplate.upsert({
    where: { id },
    update: data,
    create: {
      id,
      name: id,
      subject: data.subject || '',
      body: data.body || '',
    },
  });
}

export async function initializeDefaultTemplates() {
  const templates = [
    {
      name: 'welcome',
      subject: 'Welcome to Task Manager',
      body: `
        <h1>Welcome to Task Manager!</h1>
        <p>Hi {{username}},</p>
        <p>Your account has been created successfully.</p>
        <p>You can now start managing your tasks efficiently.</p>
        <p>Best regards,<br>The Task Manager Team</p>
      `,
    },
    {
      name: 'password-reset',
      subject: 'Password Reset Request',
      body: `
        <h1>Password Reset</h1>
        <p>Hi {{username}},</p>
        <p>We received a request to reset your password.</p>
        <p>Your new password is: <strong>{{tempPassword}}</strong></p>
        <p>Please change your password after logging in.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>The Task Manager Team</p>
      `,
    },
    {
      name: 'account-banned',
      subject: 'Account Suspended',
      body: `
        <h1>Account Suspended</h1>
        <p>Hi {{username}},</p>
        <p>Your account has been suspended.</p>
        <p>Reason: {{reason}}</p>
        <p>If you believe this is an error, please contact support.</p>
        <p>Best regards,<br>The Task Manager Team</p>
      `,
    },
  ];

  for (const template of templates) {
    await prisma.mailTemplate.upsert({
      where: { name: template.name },
      update: template,
      create: template,
    });
  }
}
