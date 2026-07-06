import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { hashPassword } from "../utils/auth.js";
import { AppError } from "../utils/app-error.js";

export const updateUserStatusSchema = z.object({
  disabled: z.boolean()
});

export const resetUserPasswordSchema = z.object({
  newPassword: z.string().min(8).max(20).default("Aa123456!")
});

export const updateSecuritySettingSchema = z.object({
  totpRequired: z.boolean().optional(),
  smsFallbackEnabled: z.boolean().optional(),
  singleDeviceLogin: z.boolean().optional(),
  passwordMinLength: z.coerce.number().int().min(8).max(20).optional(),
  passwordMaxLength: z.coerce.number().int().min(8).max(20).optional(),
  passwordHistoryLimit: z.coerce.number().int().min(1).max(10).optional(),
  loginFailCaptchaAt: z.coerce.number().int().min(1).max(10).optional(),
  loginFailLockAt: z.coerce.number().int().min(2).max(20).optional(),
  paymentFailLockAt: z.coerce.number().int().min(1).max(10).optional()
});

export async function listAdminUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      disabled: true,
      disabledAt: true,
      totpEnabled: true,
      lastLoginAt: true,
      lastLoginIp: true,
      createdAt: true
    }
  });
}

export async function updateUserStatus(id: string, input: z.infer<typeof updateUserStatusSchema>) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError("用户不存在", 404, "USER_NOT_FOUND");
  if (user.role === "ADMIN" && input.disabled) {
    throw new AppError("不能禁用系统管理员账号", 400, "CANNOT_DISABLE_ADMIN");
  }
  return prisma.user.update({
    where: { id },
    data: {
      disabled: input.disabled,
      disabledAt: input.disabled ? new Date() : null,
      activeSessionId: input.disabled ? null : user.activeSessionId,
      sessionExpiresAt: input.disabled ? null : user.sessionExpiresAt,
      sessions: input.disabled ? {
        updateMany: {
          where: { isActive: true },
          data: { isActive: false, logoutAt: new Date() }
        }
      } : undefined
    },
    select: { id: true, name: true, phone: true, role: true, disabled: true, disabledAt: true }
  });
}

export async function resetUserPassword(id: string, input: z.infer<typeof resetUserPasswordSchema>) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError("用户不存在", 404, "USER_NOT_FOUND");
  const passwordHash = hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash,
      passwordHistory: JSON.stringify([passwordHash]),
      loginFailCount: 0,
      loginLockUntil: null,
      activeSessionId: null,
      sessionExpiresAt: null,
      sessions: {
        updateMany: {
          where: { isActive: true },
          data: { isActive: false, logoutAt: new Date() }
        }
      }
    }
  });
  return { id, temporaryPassword: input.newPassword, message: "密码已重置，用户需重新登录" };
}

export async function listAdminOrders() {
  return prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      product: true,
      spec: true
    },
    take: 200
  });
}

export async function listSecurityAuditLogs() {
  return prisma.loginLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { id: true, name: true, phone: true, role: true } } }
  });
}

export async function getSecuritySetting() {
  const setting = await prisma.securitySetting.findFirst({ orderBy: { updatedAt: "desc" } });
  return setting ?? prisma.securitySetting.create({ data: {} });
}

export async function updateSecuritySetting(input: z.infer<typeof updateSecuritySettingSchema>) {
  const setting = await getSecuritySetting();
  return prisma.securitySetting.update({
    where: { id: setting.id },
    data: input
  });
}
