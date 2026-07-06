import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireMerchant } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/async-handler.js";
import {
  createWechatPaymentSchema,
  createRefund,
  createWechatPayment,
  handleWechatCallback,
  paymentCallbackSchema,
  refundSchema
} from "../services/payment.service.js";

export const paymentRoutes = Router();
const idSchema = z.string().uuid();

paymentRoutes.post("/orders/:orderId/wechat", requireAuth, asyncHandler(async (req, res) => {
  const body = createWechatPaymentSchema.parse(req.body);
  const result = await createWechatPayment(idSchema.parse(req.params.orderId), req.user!.id, body.paymentPassword);
  res.status(201).json({ data: result });
}));

paymentRoutes.post("/wechat/callback", asyncHandler(async (req, res) => {
  const body = paymentCallbackSchema.parse(req.body);
  const order = await handleWechatCallback(body);
  res.json({ data: order });
}));

paymentRoutes.post("/orders/:orderId/refund", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const body = refundSchema.parse(req.body);
  const refund = await createRefund(idSchema.parse(req.params.orderId), body);
  res.status(201).json({ data: refund });
}));
