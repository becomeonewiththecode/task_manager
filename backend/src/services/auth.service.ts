import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { hashPassword, comparePassword, meetsStrengthRequirements } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../middleware/error.middleware';
import { writeAudit } from '../utils/audit';
import { config } from '../config';

const prisma = new PrismaClient();
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function register(email: string, username: string, password: string) {
  if (!meetsStrengthRequirements(password)) {
    throw new AppError(400, 'Password must be 8+ chars with uppercase, lowercase, number, and symbol');
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) throw new AppError(409, 'Email or username already in use');

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, username, passwordHash },
    select: { id: true, email: true, username: true, totpEnabled: true, createdAt: true },
  });

  await writeAudit(prisma, user.id, 'register', 'user', user.id, {
    email: user.email,
    username: user.username,
  });

  return user;
}

export async function login(email: string, password: string, totpCode?: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) throw new AppError(401, 'Invalid credentials');

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(423, 'Account temporarily locked due to failed login attempts');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    const failedLoginCount = user.failedLoginCount + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount,
        lockedUntil: failedLoginCount >= LOCKOUT_THRESHOLD
          ? new Date(Date.now() + LOCKOUT_DURATION_MS)
          : null,
      },
    });
    await writeAudit(prisma, user.id, 'login_failed', 'user', user.id, {
      email,
      reason: 'invalid_password',
      failedAttempts: failedLoginCount,
    });
    throw new AppError(401, 'Invalid credentials');
  }

  if (user.totpEnabled) {
    if (!totpCode) throw new AppError(400, 'TOTP code required');
    if (!authenticator.verify({ token: totpCode, secret: user.totpSecret! })) {
      await writeAudit(prisma, user.id, 'login_failed', 'user', user.id, {
        email,
        reason: 'invalid_totp',
      });
      throw new AppError(401, 'Invalid 2FA code');
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  await writeAudit(prisma, user.id, 'login', 'user', user.id, {
    email,
  });

  return issueTokens(user.id, user.email);
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'Invalid refresh token');
  }

  const session = await prisma.session.findUnique({
    where: { refreshToken },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    throw new AppError(401, 'Session expired or not found');
  }

  await prisma.session.delete({ where: { id: session.id } });
  return issueTokens(session.user.id, session.user.email);
}

export async function logout(refreshToken: string) {
  const session = await prisma.session.findUnique({
    where: { refreshToken },
    select: { userId: true },
  });

  await prisma.session.deleteMany({ where: { refreshToken } });

  if (session) {
    await writeAudit(prisma, session.userId, 'logout', 'user', session.userId, {});
  }
}

export async function setupTotp(userId: string) {
  const secret = authenticator.generateSecret();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const otpauth = authenticator.keyuri(user.email, config.TOTP_APP_NAME, secret);
  const qrDataUrl = await qrcode.toDataURL(otpauth);

  await prisma.user.update({ where: { id: userId }, data: { totpSecret: secret } });

  await writeAudit(prisma, userId, 'totp_setup', 'user', userId, {});

  return { qrDataUrl, secret };
}

export async function enableTotp(userId: string, code: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.totpSecret) throw new AppError(400, 'TOTP setup not started');
  if (!authenticator.verify({ token: code, secret: user.totpSecret })) {
    throw new AppError(401, 'Invalid TOTP code');
  }
  await prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
  await writeAudit(prisma, userId, 'totp_enable', 'user', userId, {});
}

export async function disableTotp(userId: string, code: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.totpEnabled || !user.totpSecret) throw new AppError(400, 'TOTP not enabled');
  if (!authenticator.verify({ token: code, secret: user.totpSecret })) {
    throw new AppError(401, 'Invalid TOTP code');
  }
  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: false, totpSecret: null },
  });
  await writeAudit(prisma, userId, 'totp_disable', 'user', userId, {});
}

async function issueTokens(userId: string, email: string) {
  const accessToken = signAccessToken({ sub: userId, email });

  const session = await prisma.session.create({
    data: {
      userId,
      refreshToken: '',
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  const refreshToken = signRefreshToken({ sub: userId, sessionId: session.id });
  await prisma.session.update({ where: { id: session.id }, data: { refreshToken } });

  return { accessToken, refreshToken };
}
