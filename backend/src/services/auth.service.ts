import { z } from "zod";
import type { Request } from "express";
import crypto from "node:crypto";
import QRCode from "qrcode";
import { generateSecret, generateURI, verifySync } from "otplib";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { hashPassword, isBcryptHash, signToken, verifyPassword } from "../utils/auth.js";

export const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  password: z.string().min(8).max(20),
  role: z.enum(["USER", "MERCHANT"]).optional().default("USER")
});

export const loginSchema = z.object({
  phone: z.string().min(6),
  password: z.string().min(1),
  captcha: z.string().optional(),
  smsCode: z.string().optional(),
  totpCode: z.string().optional(),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  forceLogin: z.boolean().optional().default(false)
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8).max(20),
  smsCode: z.string().min(1)
});

export const resetPasswordSchema = z.object({
  phone: z.string().min(6),
  smsCode: z.string().min(1),
  newPassword: z.string().min(8).max(20)
});

export const paymentPasswordSchema = z.object({
  paymentPassword: z.string().regex(/^\d{6}$/, "支付密码必须是 6 位数字"),
  oldPaymentPassword: z.string().regex(/^\d{6}$/).optional(),
  smsCode: z.string().optional()
});

export const paymentVerifySchema = z.object({
  paymentPassword: z.string().regex(/^\d{6}$/, "支付密码必须是 6 位数字")
});

export const totpVerifySchema = z.object({
  token: z.string().regex(/^\d{6}$/, "TOTP 动态验证码必须是 6 位数字")
});

export const totpDisableSchema = z.object({
  token: z.string().regex(/^\d{6}$/, "TOTP 动态验证码必须是 6 位数字"),
  smsCode: z.string().min(1)
});

const weakPasswords = new Set([
  "12345678",
  "password",
  "password1",
  "qwertyui",
  "qwerty123",
  "abc123456",
  "11111111",
  "123456789",
  "admin123",
  "iloveyou"
]);

const smsPlaceholderCode = "123456";
const captchaPlaceholderCode = "1234";

function formatAuthUser(user: {
  id: string;
  name: string;
  phone: string;
  role: string;
}) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role
  };
}

function getRequestIp(req?: Request) {
  return req?.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req?.ip || req?.socket.remoteAddress || "";
}

function getDeviceName(req?: Request, inputDeviceName?: string) {
  return inputDeviceName || req?.headers["user-agent"]?.toString() || "未知设备";
}

function getDeviceId(req?: Request, inputDeviceId?: string) {
  return inputDeviceId || Buffer.from(getDeviceName(req)).toString("base64").slice(0, 64);
}

function assertSmsCode(code?: string) {
  if (code !== smsPlaceholderCode) {
    throw new AppError("短信验证码错误（测试验证码为 123456）", 400, "INVALID_SMS_CODE");
  }
}

function assertCaptcha(code?: string) {
  if (code !== captchaPlaceholderCode) {
    throw new AppError("图形验证码错误（测试验证码为 1234）", 400, "INVALID_CAPTCHA");
  }
}

function assertStrongPassword(password: string) {
  if (weakPasswords.has(password.toLowerCase())) {
    throw new AppError("密码过于常见，请更换更安全的密码", 400, "WEAK_PASSWORD_BLACKLISTED");
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
    throw new AppError("密码需为 8-20 位，并同时包含大写字母、小写字母、数字和特殊字符（@$!%*?&）", 400, "PASSWORD_COMPLEXITY_REQUIRED");
  }
}

function parsePasswordHistory(value?: string | null) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function assertPasswordHistory(password: string, currentHash?: string | null, historyValue?: string | null) {
  const recentHashes = [currentHash, ...parsePasswordHistory(historyValue)].filter(Boolean).slice(0, 3) as string[];
  if (recentHashes.some((hash) => verifyPassword(password, hash))) {
    throw new AppError("新密码不能与最近 3 次使用过的密码相同", 400, "PASSWORD_REUSED");
  }
}

async function recordLoginLog(input: { userId?: string; phone: string; role?: string; req?: Request; success: boolean; reason?: string; deviceName?: string }) {
  await prisma.loginLog.create({
    data: {
      userId: input.userId,
      phone: input.phone,
      ip: getRequestIp(input.req),
      device: getDeviceName(input.req, input.deviceName),
      success: input.success,
      reason: input.reason,
      role: input.role
    }
  });
}

function getLockUntil(failCount: number) {
  const now = Date.now();
  if (failCount >= 10) return new Date(now + 60 * 60 * 1000);
  if (failCount >= 5) return new Date(now + 15 * 60 * 1000);
  return null;
}

function assertTotp(secret: string | null | undefined, token?: string) {
  if (!secret || !token || !verifySync({ token, secret })) {
    throw new AppError("TOTP 动态验证码错误或已过期", 401, "INVALID_TOTP_CODE");
  }
}

function buildSessionExpiry() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

async function createSingleSession(user: { id: string; phone: string; role: string; activeSessionId?: string | null }, req?: Request, input?: { deviceId?: string; deviceName?: string; forceLogin?: boolean }) {
  const deviceId = getDeviceId(req, input?.deviceId);
  const existingActive = user.activeSessionId
    ? await prisma.userSession.findFirst({ where: { id: user.activeSessionId, isActive: true } })
    : null;
  if (existingActive && existingActive.deviceId !== deviceId && !input?.forceLogin) {
    throw new AppError("已有设备在登录，是否继续？继续后旧设备将被下线。", 409, "SESSION_CONFLICT");
  }
  const sessionId = crypto.randomUUID();
  const expiresAt = buildSessionExpiry();
  await prisma.$transaction(async (tx) => {
    await tx.userSession.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false, logoutAt: new Date() }
    });
    await tx.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        deviceId,
        deviceName: getDeviceName(req, input?.deviceName),
        ip: getRequestIp(req),
        userAgent: req?.headers["user-agent"]?.toString(),
        expiresAt,
        isActive: true
      }
    });
    await tx.user.update({
      where: { id: user.id },
      data: { activeSessionId: sessionId, sessionExpiresAt: expiresAt }
    });
  });
  return { sessionId, expiresAt };
}

export async function register(input: z.infer<typeof registerSchema>) {
  if (input.role === "MERCHANT") {
    throw new AppError("商家账号仅可由平台初始化创建，普通注册不能选择商家角色", 403, "MERCHANT_REGISTRATION_DISABLED");
  }
  assertStrongPassword(input.password);
  const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (existing?.passwordHash) {
    throw new AppError("手机号已注册，请直接登录", 409, "PHONE_EXISTS");
  }
  const passwordHash = hashPassword(input.password);

  const user = existing
    ? await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        passwordHash,
        passwordHistory: JSON.stringify([passwordHash]),
        role: input.role
      }
    })
    : await prisma.user.create({
      data: {
        name: input.name,
        phone: input.phone,
        passwordHash,
        passwordHistory: JSON.stringify([passwordHash]),
        role: input.role
      }
    });

  const token = signToken({ sub: user.id, phone: user.phone, role: user.role });
  return { user: formatAuthUser(user), token };
}

export async function login(input: z.infer<typeof loginSchema>, req?: Request) {
  const user = await prisma.user.findUnique({ where: { phone: input.phone } });
  const now = new Date();
  if (user?.loginLockUntil && user.loginLockUntil > now) {
    await recordLoginLog({ userId: user.id, phone: input.phone, role: user.role, req, success: false, reason: "账号锁定", deviceName: input.deviceName });
    throw new AppError(`账号已锁定，请在 ${user.loginLockUntil.toLocaleString()} 后再试`, 423, user.loginFailCount >= 10 ? "ACCOUNT_LOCKED_CONTACT_SERVICE" : "ACCOUNT_LOCKED");
  }
  if (user?.disabled) {
    await recordLoginLog({ userId: user.id, phone: input.phone, role: user.role, req, success: false, reason: "账号已禁用", deviceName: input.deviceName });
    throw new AppError("账号已被系统管理员禁用", 403, "ACCOUNT_DISABLED");
  }
  if (user && user.loginFailCount >= 3) {
    assertCaptcha(input.captcha);
  }
  if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
    if (user) {
      const failCount = user.loginFailCount + 1;
      const loginLockUntil = getLockUntil(failCount);
      await prisma.user.update({
        where: { id: user.id },
        data: { loginFailCount: failCount, loginLockUntil }
      });
      await recordLoginLog({ userId: user.id, phone: input.phone, role: user.role, req, success: false, reason: "密码错误", deviceName: input.deviceName });
      if (failCount >= 10) throw new AppError("登录失败过多，账号已锁定 1 小时，请联系客服解锁", 423, "ACCOUNT_LOCKED_CONTACT_SERVICE");
      if (failCount >= 5) throw new AppError("登录失败过多，账号已锁定 15 分钟", 423, "ACCOUNT_LOCKED");
      if (failCount >= 3) throw new AppError("手机号或密码错误，请输入图形验证码后重试（测试验证码为 1234）", 401, "CAPTCHA_REQUIRED");
    }
    throw new AppError("手机号或密码错误", 401, "INVALID_CREDENTIALS");
  }
  const deviceId = getDeviceId(req, input.deviceId);
  const existingDevice = await prisma.device.findUnique({
    where: { userId_deviceId: { userId: user.id, deviceId } }
  });
  if (!existingDevice && input.smsCode !== smsPlaceholderCode) {
    await recordLoginLog({ userId: user.id, phone: input.phone, role: user.role, req, success: false, reason: "陌生设备需短信验证", deviceName: input.deviceName });
    throw new AppError("检测到陌生设备登录，请输入短信验证码（测试验证码为 123456）", 401, "NEW_DEVICE_SMS_REQUIRED");
  }
  if (user.totpEnabled) {
    if (!input.totpCode) {
      await recordLoginLog({ userId: user.id, phone: input.phone, role: user.role, req, success: false, reason: "等待 TOTP 二次验证", deviceName: input.deviceName });
      throw new AppError("请输入 TOTP 动态验证码", 401, "TOTP_REQUIRED");
    }
    assertTotp(user.totpSecret, input.totpCode);
  }
  if (!isBcryptHash(user.passwordHash)) {
    const upgradedHash = hashPassword(input.password);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: upgradedHash,
        passwordHistory: JSON.stringify([upgradedHash, ...parsePasswordHistory(user.passwordHistory)].slice(0, 3))
      }
    });
  }
  await prisma.device.upsert({
    where: { userId_deviceId: { userId: user.id, deviceId } },
    update: {
      ip: getRequestIp(req),
      deviceName: getDeviceName(req, input.deviceName),
      trusted: true,
      smsVerified: true,
      lastLoginAt: now
    },
    create: {
      userId: user.id,
      deviceId,
      deviceName: getDeviceName(req, input.deviceName),
      ip: getRequestIp(req),
      trusted: true,
      smsVerified: true
    }
  });
  await prisma.user.update({
    where: { id: user.id },
    data: {
      loginFailCount: 0,
      loginLockUntil: null,
      lastLoginAt: now,
      lastLoginIp: getRequestIp(req)
    }
  });
  const session = await createSingleSession(user, req, input);
  await recordLoginLog({ userId: user.id, phone: input.phone, role: user.role, req, success: true, reason: user.role === "MERCHANT" ? "商家后台登录成功" : "登录成功", deviceName: input.deviceName });
  const token = signToken({ sub: user.id, phone: user.phone, role: user.role, sessionId: session.sessionId });
  return {
    user: formatAuthUser(user),
    token,
    sessionId: session.sessionId,
    sessionExpiresAt: session.expiresAt,
    totpSetupRequired: !user.totpEnabled
  };
}

export async function getCurrentUser(id: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id } });
  return formatAuthUser(user);
}

export async function listLoginLogs(userId: string) {
  return prisma.loginLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50
  });
}

export async function changePassword(userId: string, input: z.infer<typeof changePasswordSchema>) {
  assertSmsCode(input.smsCode);
  assertStrongPassword(input.newPassword);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.passwordHash || !verifyPassword(input.oldPassword, user.passwordHash)) {
    throw new AppError("旧密码错误", 400, "INVALID_OLD_PASSWORD");
  }
  assertPasswordHistory(input.newPassword, user.passwordHash, user.passwordHistory);
  const passwordHash = hashPassword(input.newPassword);
  const history = [passwordHash, user.passwordHash, ...parsePasswordHistory(user.passwordHistory)].slice(0, 3);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordHistory: JSON.stringify(history) }
  });
  return { message: "密码已修改，请重新登录所有设备" };
}

export async function resetPassword(input: z.infer<typeof resetPasswordSchema>) {
  assertSmsCode(input.smsCode);
  assertStrongPassword(input.newPassword);
  const user = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (!user) throw new AppError("手机号未注册", 404, "USER_NOT_FOUND");
  assertPasswordHistory(input.newPassword, user.passwordHash, user.passwordHistory);
  const passwordHash = hashPassword(input.newPassword);
  const history = [passwordHash, user.passwordHash, ...parsePasswordHistory(user.passwordHistory)].filter(Boolean).slice(0, 3);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordHistory: JSON.stringify(history),
      loginFailCount: 0,
      loginLockUntil: null
    }
  });
  return { message: "密码已重置，通知短信已发送（占位）" };
}

export async function setPaymentPassword(userId: string, input: z.infer<typeof paymentPasswordSchema>) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.paymentPasswordHash) {
    if (!input.oldPaymentPassword || !verifyPassword(input.oldPaymentPassword, user.paymentPasswordHash)) {
      throw new AppError("旧支付密码错误", 400, "INVALID_OLD_PAYMENT_PASSWORD");
    }
    assertSmsCode(input.smsCode);
  }
  const paymentPasswordHash = hashPassword(input.paymentPassword);
  await prisma.user.update({
    where: { id: userId },
    data: {
      paymentPasswordHash,
      paymentFailCount: 0,
      paymentLockUntil: null
    }
  });
  return { message: user.paymentPasswordHash ? "支付密码已修改" : "支付密码已设置" };
}

export async function verifyPaymentPassword(userId: string, input: z.infer<typeof paymentVerifySchema>) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.paymentLockUntil && user.paymentLockUntil > new Date()) {
    throw new AppError("支付功能已锁定，请 30 分钟后再试", 423, "PAYMENT_LOCKED");
  }
  if (!user.paymentPasswordHash) {
    throw new AppError("请先设置支付密码", 400, "PAYMENT_PASSWORD_REQUIRED");
  }
  if (!verifyPassword(input.paymentPassword, user.paymentPasswordHash)) {
    const failCount = user.paymentFailCount + 1;
    const paymentLockUntil = failCount >= 3 ? new Date(Date.now() + 30 * 60 * 1000) : null;
    await prisma.user.update({
      where: { id: userId },
      data: { paymentFailCount: failCount, paymentLockUntil }
    });
    if (failCount >= 3) throw new AppError("支付密码错误 3 次，支付功能已锁定 30 分钟", 423, "PAYMENT_LOCKED");
    throw new AppError("支付密码错误", 401, "INVALID_PAYMENT_PASSWORD");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { paymentFailCount: 0, paymentLockUntil: null }
  });
  return { verified: true };
}

export async function setupTotp(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const secret = generateSecret();
  const otpauthUrl = generateURI({ issuer: "ClothingRental", label: user.phone, secret, period: 30, digits: 6 });
  const qrCode = await QRCode.toDataURL(otpauthUrl);
  await prisma.user.update({
    where: { id: userId },
    data: {
      totpSecret: secret,
      totpEnabled: false
    }
  });
  return { secret, otpauthUrl, qrCode };
}

export async function verifyTotpSetup(userId: string, input: z.infer<typeof totpVerifySchema>) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  assertTotp(user.totpSecret, input.token);
  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: true }
  });
  return { enabled: true };
}

export async function disableTotp(userId: string, input: z.infer<typeof totpDisableSchema>) {
  assertSmsCode(input.smsCode);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  assertTotp(user.totpSecret, input.token);
  await prisma.user.update({
    where: { id: userId },
    data: {
      totpSecret: null,
      totpEnabled: false
    }
  });
  return { enabled: false };
}

export async function listSessions(userId: string) {
  return prisma.userSession.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { lastActiveAt: "desc" }],
    take: 20
  });
}

export async function logoutSession(userId: string, sessionId: string) {
  const session = await prisma.userSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new AppError("设备会话不存在", 404, "SESSION_NOT_FOUND");
  await prisma.$transaction(async (tx) => {
    await tx.userSession.update({
      where: { id: session.id },
      data: { isActive: false, logoutAt: new Date() }
    });
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (user?.activeSessionId === session.id) {
      await tx.user.update({
        where: { id: userId },
        data: { activeSessionId: null, sessionExpiresAt: null }
      });
    }
  });
  return { success: true };
}

export async function logoutCurrentSession(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.activeSessionId) return { success: true };
  return logoutSession(userId, user.activeSessionId);
}

export async function getDeviceStatus(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const session = user.activeSessionId
    ? await prisma.userSession.findUnique({ where: { id: user.activeSessionId } })
    : null;
  return {
    activeSessionId: user.activeSessionId,
    sessionExpiresAt: user.sessionExpiresAt,
    active: Boolean(session?.isActive && session.expiresAt > new Date()),
    session
  };
}
