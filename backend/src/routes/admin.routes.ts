import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/async-handler.js";
import {
  getSecuritySetting,
  listAdminOrders,
  listAdminUsers,
  listSecurityAuditLogs,
  resetUserPassword,
  resetUserPasswordSchema,
  updateSecuritySetting,
  updateSecuritySettingSchema,
  updateUserStatus,
  updateUserStatusSchema
} from "../services/admin.service.js";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireAdmin);

const idSchema = z.string().uuid();

adminRoutes.get("/users", asyncHandler(async (_req, res) => {
  res.json({ data: await listAdminUsers() });
}));

adminRoutes.patch("/users/:id/status", asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const body = updateUserStatusSchema.parse(req.body);
  res.json({ data: await updateUserStatus(id, body) });
}));

adminRoutes.post("/users/:id/reset-password", asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const body = resetUserPasswordSchema.parse(req.body);
  res.json({ data: await resetUserPassword(id, body) });
}));

adminRoutes.get("/orders", asyncHandler(async (_req, res) => {
  res.json({ data: await listAdminOrders() });
}));

adminRoutes.get("/audit-logs", asyncHandler(async (_req, res) => {
  res.json({ data: await listSecurityAuditLogs() });
}));

adminRoutes.get("/security-settings", asyncHandler(async (_req, res) => {
  res.json({ data: await getSecuritySetting() });
}));

adminRoutes.put("/security-settings", asyncHandler(async (req, res) => {
  const body = updateSecuritySettingSchema.parse(req.body);
  res.json({ data: await updateSecuritySetting(body) });
}));
