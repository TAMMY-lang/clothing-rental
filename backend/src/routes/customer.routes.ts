import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/async-handler.js";
import {
  addCartItem,
  addCartItemSchema,
  addFavorite,
  listCart,
  listFavorites,
  removeCartItem,
  removeFavorite
} from "../services/customer.service.js";

export const customerRoutes = Router();
const idSchema = z.string().uuid();

customerRoutes.use(requireAuth);

customerRoutes.get("/cart", asyncHandler(async (req, res) => {
  const items = await listCart(req.user!.id);
  res.json({ data: items });
}));

customerRoutes.post("/cart", asyncHandler(async (req, res) => {
  const body = addCartItemSchema.parse(req.body);
  const item = await addCartItem(req.user!.id, body);
  res.status(201).json({ data: item });
}));

customerRoutes.delete("/cart/:id", asyncHandler(async (req, res) => {
  const item = await removeCartItem(req.user!.id, idSchema.parse(req.params.id));
  res.json({ data: item });
}));

customerRoutes.get("/favorites", asyncHandler(async (req, res) => {
  const items = await listFavorites(req.user!.id);
  res.json({ data: items });
}));

customerRoutes.post("/favorites/:productId", asyncHandler(async (req, res) => {
  const item = await addFavorite(req.user!.id, idSchema.parse(req.params.productId));
  res.status(201).json({ data: item });
}));

customerRoutes.delete("/favorites/:productId", asyncHandler(async (req, res) => {
  const item = await removeFavorite(req.user!.id, idSchema.parse(req.params.productId));
  res.json({ data: item });
}));
