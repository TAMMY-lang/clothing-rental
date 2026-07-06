import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireMerchant } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/async-handler.js";
import {
  adjustOrderPrice,
  adjustPriceSchema,
  cancelOrder,
  confirmPayment,
  createOrder,
  createOrderSchema,
  decideTryOnOrder,
  delayShipment,
  delayShipmentSchema,
  getOrder,
  inspectReturn,
  inspectReturnSchema,
  interceptShipment,
  interceptShipmentSchema,
  listOrders,
  listOrdersSchema,
  markAsRenting,
  payNormalExtension,
  refreshLogistics,
  requestExtension,
  requestExtensionSchema,
  requestReturn,
  shipOrderSchema,
  tryOnDecisionSchema,
  reviewExtension,
  reviewExtensionSchema,
  reviewForceMajeureExtension
} from "../services/order.service.js";

export const orderRoutes = Router();

const idSchema = z.string().uuid();

orderRoutes.use(requireAuth);

orderRoutes.get("/", asyncHandler(async (req, res) => {
  const query = listOrdersSchema.parse(req.query);
  const orders = await listOrders(query, req.user!.role === "MERCHANT" ? query.userId : req.user!.id);
  res.json({ data: orders });
}));

orderRoutes.post("/", asyncHandler(async (req, res) => {
  const body = createOrderSchema.parse(req.body);
  const order = await createOrder(body, req.user!.id);
  res.status(201).json({ data: order });
}));

orderRoutes.get("/:id", asyncHandler(async (req, res) => {
  const order = await getOrder(idSchema.parse(req.params.id));
  res.json({ data: order });
}));

orderRoutes.post("/:id/pay", asyncHandler(async (req, res) => {
  const order = await confirmPayment(idSchema.parse(req.params.id));
  res.json({ data: order });
}));

orderRoutes.post("/:id/payments/confirm", asyncHandler(async (req, res) => {
  const order = await confirmPayment(idSchema.parse(req.params.id));
  res.json({ data: order });
}));

orderRoutes.post("/:id/shipments/mark-renting", requireMerchant, asyncHandler(async (req, res) => {
  const body = shipOrderSchema.parse(req.body);
  const order = await markAsRenting(idSchema.parse(req.params.id), body);
  res.json({ data: order });
}));

orderRoutes.post("/:id/logistics/refresh", asyncHandler(async (req, res) => {
  const order = await refreshLogistics(idSchema.parse(req.params.id));
  res.json({ data: order });
}));

orderRoutes.post("/:id/return", asyncHandler(async (req, res) => {
  const order = await requestReturn(idSchema.parse(req.params.id));
  res.json({ data: order });
}));

orderRoutes.post("/:id/inspection", requireMerchant, asyncHandler(async (req, res) => {
  const body = inspectReturnSchema.parse(req.body);
  const order = await inspectReturn(idSchema.parse(req.params.id), body);
  res.json({ data: order });
}));

orderRoutes.post("/:id/cancel", asyncHandler(async (req, res) => {
  const order = await cancelOrder(idSchema.parse(req.params.id));
  res.json({ data: order });
}));

orderRoutes.post("/:id/adjust-price", requireMerchant, asyncHandler(async (req, res) => {
  const body = adjustPriceSchema.parse(req.body);
  const order = await adjustOrderPrice(idSchema.parse(req.params.id), body);
  res.json({ data: order });
}));

orderRoutes.post("/:id/delay-shipment", requireMerchant, asyncHandler(async (req, res) => {
  const body = delayShipmentSchema.parse(req.body);
  const order = await delayShipment(idSchema.parse(req.params.id), body);
  res.json({ data: order });
}));

orderRoutes.post("/:id/try-on/decision", asyncHandler(async (req, res) => {
  const body = tryOnDecisionSchema.parse(req.body);
  const order = await decideTryOnOrder(idSchema.parse(req.params.id), body, req.user!.id);
  res.json({ data: order });
}));

orderRoutes.post("/:id/intercept", requireMerchant, asyncHandler(async (req, res) => {
  const body = interceptShipmentSchema.parse(req.body);
  const order = await interceptShipment(idSchema.parse(req.params.id), body);
  res.json({ data: order });
}));

orderRoutes.post("/:id/extend", asyncHandler(async (req, res) => {
  const body = requestExtensionSchema.parse(req.body);
  const result = await requestExtension(idSchema.parse(req.params.id), body);
  res.status(201).json({ data: result });
}));

orderRoutes.post("/:id/extend/review", requireMerchant, asyncHandler(async (req, res) => {
  const body = reviewExtensionSchema.parse(req.body);
  const order = await reviewExtension(idSchema.parse(req.params.id), body);
  res.json({ data: order });
}));

orderRoutes.post("/:id/extensions", asyncHandler(async (req, res) => {
  const body = requestExtensionSchema.parse(req.body);
  const review = await requestExtension(idSchema.parse(req.params.id), body);
  res.status(201).json({ data: review });
}));

orderRoutes.post("/:id/extensions/pay", asyncHandler(async (req, res) => {
  const order = await payNormalExtension(idSchema.parse(req.params.id));
  res.json({ data: order });
}));

orderRoutes.post("/:id/extensions/review-force-majeure", requireMerchant, asyncHandler(async (req, res) => {
  const body = reviewExtensionSchema.parse(req.body);
  const order = await reviewForceMajeureExtension(idSchema.parse(req.params.id), body);
  res.json({ data: order });
}));
