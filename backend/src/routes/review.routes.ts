import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireMerchant } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/async-handler.js";
import {
  auditProductReview,
  createProductReview,
  createProductReviewSchema,
  createTenantReview,
  listApprovedProductReviews,
  listMerchantReviews,
  merchantReplySchema,
  replyProductReview,
  reviewAuditSchema,
  tenantReviewSchema
} from "../services/review.service.js";

export const reviewRoutes = Router();

reviewRoutes.get("/products/:productId", asyncHandler(async (req, res) => {
  const productId = z.string().uuid().parse(req.params.productId);
  const reviews = await listApprovedProductReviews(productId);
  res.json({ data: reviews });
}));

reviewRoutes.get("/merchant", requireAuth, requireMerchant, asyncHandler(async (_req, res) => {
  const reviews = await listMerchantReviews();
  res.json({ data: reviews });
}));

reviewRoutes.post("/orders/:orderId", requireAuth, asyncHandler(async (req, res) => {
  const orderId = z.string().uuid().parse(req.params.orderId);
  const body = createProductReviewSchema.parse(req.body);
  const review = await createProductReview(req.user!.id, orderId, body);
  res.status(201).json({ data: review });
}));

reviewRoutes.post("/orders/:orderId/tenant", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const orderId = z.string().uuid().parse(req.params.orderId);
  const body = tenantReviewSchema.parse(req.body);
  const review = await createTenantReview(req.user!.id, orderId, body);
  res.status(201).json({ data: review });
}));

reviewRoutes.patch("/:id/audit", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const body = reviewAuditSchema.parse(req.body);
  const review = await auditProductReview(req.user!.id, id, body);
  res.json({ data: review });
}));

reviewRoutes.post("/:id/reply", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const body = merchantReplySchema.parse(req.body);
  const review = await replyProductReview(id, body.reply);
  res.json({ data: review });
}));
