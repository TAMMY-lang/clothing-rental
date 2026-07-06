import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { getTokenFromRequest, verifyToken } from "../utils/auth.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      next(new AppError("请先登录", 401, "AUTH_REQUIRED"));
      return;
    }
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      next(new AppError("登录状态无效，请重新登录", 401, "INVALID_TOKEN"));
      return;
    }
    if (payload.sessionId) {
      const session = await prisma.userSession.findUnique({ where: { id: payload.sessionId } });
      const now = new Date();
      if (!session || !session.isActive || session.expiresAt <= now || user.activeSessionId !== payload.sessionId) {
        next(new AppError("账号已在其他设备登录，请重新登录", 401, "SESSION_REPLACED"));
        return;
      }
      await prisma.userSession.update({
        where: { id: session.id },
        data: { lastActiveAt: now }
      });
    }
    req.user = {
      id: payload.sub,
      phone: payload.phone,
      role: payload.role
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireMerchant(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "MERCHANT" && req.user?.role !== "ADMIN") {
    next(new AppError("需要商家权限", 403, "MERCHANT_REQUIRED"));
    return;
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    next(new AppError("需要系统管理员权限", 403, "ADMIN_REQUIRED"));
    return;
  }
  next();
}
