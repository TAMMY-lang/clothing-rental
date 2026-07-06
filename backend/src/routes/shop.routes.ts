import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireMerchant } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/async-handler.js";
import {
  approveWithdrawal,
  createCoupon,
  createCouponSchema,
  createMemberLevel,
  createMemberLevelSchema,
  createReturnAddress,
  createReturnAddressSchema,
  createWithdrawal,
  createWithdrawalMethod,
  createWithdrawalMethodSchema,
  createWithdrawalSchema,
  completeWithdrawal,
  getAnnouncement,
  getMerchantWallet,
  getShopSetting,
  getTryOnSetting,
  listWalletTransactions,
  listReturnAddresses,
  listMemberLevels,
  listCoupons,
  listWithdrawals,
  listWithdrawalMethods,
  rejectWithdrawal,
  settleDueOrders,
  setDefaultReturnAddress,
  updateReturnAddressStatus,
  updateMemberLevelStatus,
  updateCouponStatus,
  updateCouponStatusSchema,
  updateAnnouncement,
  updateAnnouncementSchema,
  updateShopSetting,
  updateSettlementSettingSchema,
  updateTryOnSetting,
  updateTryOnSettingSchema
} from "../services/shop.service.js";

export const shopRoutes = Router();

shopRoutes.get("/announcement", asyncHandler(async (_req, res) => {
  const announcement = await getAnnouncement();
  res.json({ data: announcement });
}));

shopRoutes.put("/announcement", asyncHandler(async (req, res) => {
  const body = updateAnnouncementSchema.parse(req.body);
  const announcement = await updateAnnouncement(body);
  res.json({ data: announcement });
}));

shopRoutes.get("/coupons", asyncHandler(async (req, res) => {
  const onlyEnabled = req.query.enabled === "true";
  const coupons = await listCoupons(onlyEnabled);
  res.json({ data: coupons });
}));

shopRoutes.post("/coupons", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const body = createCouponSchema.parse(req.body);
  const coupon = await createCoupon(body);
  res.status(201).json({ data: coupon });
}));

shopRoutes.patch("/coupons/:id/status", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const body = updateCouponStatusSchema.parse(req.body);
  const coupon = await updateCouponStatus(id, body.enabled);
  res.json({ data: coupon });
}));

shopRoutes.get("/wallet", requireAuth, requireMerchant, asyncHandler(async (_req, res) => {
  const wallet = await getMerchantWallet();
  res.json({ data: wallet });
}));

shopRoutes.get("/withdrawals", requireAuth, requireMerchant, asyncHandler(async (_req, res) => {
  const withdrawals = await listWithdrawals();
  res.json({ data: withdrawals });
}));

shopRoutes.post("/withdrawals", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const body = createWithdrawalSchema.parse(req.body);
  const withdrawal = await createWithdrawal(body);
  res.status(201).json({ data: withdrawal });
}));

shopRoutes.patch("/withdrawals/:id/approve", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const withdrawal = await approveWithdrawal(z.string().uuid().parse(req.params.id));
  res.json({ data: withdrawal });
}));

shopRoutes.patch("/withdrawals/:id/complete", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const withdrawal = await completeWithdrawal(z.string().uuid().parse(req.params.id));
  res.json({ data: withdrawal });
}));

shopRoutes.patch("/withdrawals/:id/reject", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const withdrawal = await rejectWithdrawal(z.string().uuid().parse(req.params.id));
  res.json({ data: withdrawal });
}));

shopRoutes.get("/withdrawal-methods", requireAuth, requireMerchant, asyncHandler(async (_req, res) => {
  const methods = await listWithdrawalMethods();
  res.json({ data: methods });
}));

shopRoutes.post("/withdrawal-methods", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const body = createWithdrawalMethodSchema.parse(req.body);
  const method = await createWithdrawalMethod(body);
  res.status(201).json({ data: method });
}));

shopRoutes.get("/wallet/transactions", requireAuth, requireMerchant, asyncHandler(async (_req, res) => {
  const transactions = await listWalletTransactions();
  res.json({ data: transactions });
}));

shopRoutes.get("/settings", requireAuth, requireMerchant, asyncHandler(async (_req, res) => {
  const setting = await getShopSetting();
  res.json({ data: setting });
}));

shopRoutes.put("/settings", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const body = updateSettlementSettingSchema.parse(req.body);
  const setting = await updateShopSetting(body);
  res.json({ data: setting });
}));

shopRoutes.post("/settlements/run", requireAuth, requireMerchant, asyncHandler(async (_req, res) => {
  const orders = await settleDueOrders();
  res.json({ data: orders });
}));

shopRoutes.get("/member-levels", asyncHandler(async (_req, res) => {
  const levels = await listMemberLevels();
  res.json({ data: levels });
}));

shopRoutes.post("/member-levels", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const body = createMemberLevelSchema.parse(req.body);
  const level = await createMemberLevel(body);
  res.status(201).json({ data: level });
}));

shopRoutes.patch("/member-levels/:id/status", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const body = updateCouponStatusSchema.parse(req.body);
  const level = await updateMemberLevelStatus(id, body.enabled);
  res.json({ data: level });
}));

shopRoutes.get("/try-on-setting", asyncHandler(async (_req, res) => {
  const setting = await getTryOnSetting();
  res.json({ data: setting });
}));

shopRoutes.put("/try-on-setting", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const body = updateTryOnSettingSchema.parse(req.body);
  const setting = await updateTryOnSetting(body);
  res.json({ data: setting });
}));

shopRoutes.get("/return-addresses", asyncHandler(async (req, res) => {
  const onlyEnabled = req.query.enabled === "true";
  const addresses = await listReturnAddresses(onlyEnabled);
  res.json({ data: addresses });
}));

shopRoutes.post("/return-addresses", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const body = createReturnAddressSchema.parse(req.body);
  const address = await createReturnAddress(body);
  res.status(201).json({ data: address });
}));

shopRoutes.patch("/return-addresses/:id/status", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const body = updateCouponStatusSchema.parse(req.body);
  const address = await updateReturnAddressStatus(id, body.enabled);
  res.json({ data: address });
}));

shopRoutes.patch("/return-addresses/:id/default", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const address = await setDefaultReturnAddress(id);
  res.json({ data: address });
}));
