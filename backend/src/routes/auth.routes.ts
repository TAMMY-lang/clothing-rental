import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/async-handler.js";
import {
  changePassword,
  changePasswordSchema,
  disableTotp,
  getDeviceStatus,
  getCurrentUser,
  listLoginLogs,
  listSessions,
  login,
  loginSchema,
  logoutCurrentSession,
  logoutSession,
  paymentPasswordSchema,
  paymentVerifySchema,
  register,
  registerSchema,
  resetPassword,
  resetPasswordSchema,
  setPaymentPassword,
  setupTotp,
  totpDisableSchema,
  totpVerifySchema,
  verifyTotpSetup,
  verifyPaymentPassword
} from "../services/auth.service.js";

export const authRoutes = Router();

authRoutes.post("/register", asyncHandler(async (req, res) => {
  const body = registerSchema.parse(req.body);
  const result = await register(body);
  res.status(201).json({ data: result });
}));

authRoutes.post("/login", asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);
  const result = await login(body, req);
  res.json({ data: result });
}));

authRoutes.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.user!.id);
  res.json({ data: user });
}));

authRoutes.get("/login-logs", requireAuth, asyncHandler(async (req, res) => {
  const logs = await listLoginLogs(req.user!.id);
  res.json({ data: logs });
}));

authRoutes.post("/change-password", requireAuth, asyncHandler(async (req, res) => {
  const body = changePasswordSchema.parse(req.body);
  const result = await changePassword(req.user!.id, body);
  res.json({ data: result });
}));

authRoutes.post("/reset-password", asyncHandler(async (req, res) => {
  const body = resetPasswordSchema.parse(req.body);
  const result = await resetPassword(body);
  res.json({ data: result });
}));

authRoutes.post("/set-payment-password", requireAuth, asyncHandler(async (req, res) => {
  const body = paymentPasswordSchema.parse(req.body);
  const result = await setPaymentPassword(req.user!.id, body);
  res.json({ data: result });
}));

authRoutes.post("/payment-verify", requireAuth, asyncHandler(async (req, res) => {
  const body = paymentVerifySchema.parse(req.body);
  const result = await verifyPaymentPassword(req.user!.id, body);
  res.json({ data: result });
}));

authRoutes.post("/totp/setup", requireAuth, asyncHandler(async (req, res) => {
  const result = await setupTotp(req.user!.id);
  res.json({ data: result });
}));

authRoutes.post("/totp/verify", requireAuth, asyncHandler(async (req, res) => {
  const body = totpVerifySchema.parse(req.body);
  const result = await verifyTotpSetup(req.user!.id, body);
  res.json({ data: result });
}));

authRoutes.post("/totp/disable", requireAuth, asyncHandler(async (req, res) => {
  const body = totpDisableSchema.parse(req.body);
  const result = await disableTotp(req.user!.id, body);
  res.json({ data: result });
}));

authRoutes.post("/sessions", requireAuth, asyncHandler(async (req, res) => {
  const sessions = await listSessions(req.user!.id);
  res.json({ data: sessions });
}));

authRoutes.delete("/sessions/:id", requireAuth, asyncHandler(async (req, res) => {
  const result = await logoutSession(req.user!.id, String(req.params.id));
  res.json({ data: result });
}));

authRoutes.post("/logout", requireAuth, asyncHandler(async (req, res) => {
  const result = await logoutCurrentSession(req.user!.id);
  res.json({ data: result });
}));

authRoutes.get("/device-status", requireAuth, asyncHandler(async (req, res) => {
  const result = await getDeviceStatus(req.user!.id);
  res.json({ data: result });
}));
