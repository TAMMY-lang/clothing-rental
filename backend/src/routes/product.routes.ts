import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireMerchant } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/async-handler.js";
import {
  activateAllProducts,
  createCategory,
  createCategorySchema,
  createProduct,
  createProductSchema,
  deleteProduct,
  getProductById,
  getProductOverview,
  listCategories,
  listProducts,
  listProductsSchema,
  updateProductStatus,
  updateProductStatusSchema,
  updateProductSpec,
  updateProductSpecSchema,
  updateSpecStock,
  updateSpecStockSchema
} from "../services/product.service.js";

export const productRoutes = Router();

productRoutes.get("/categories", asyncHandler(async (_req, res) => {
  const categories = await listCategories();
  res.json({ data: categories });
}));

productRoutes.post("/categories", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const body = createCategorySchema.parse(req.body);
  const category = await createCategory(body);
  res.status(201).json({ data: category });
}));

productRoutes.get("/overview", requireAuth, requireMerchant, asyncHandler(async (_req, res) => {
  const overview = await getProductOverview();
  res.json({ data: overview });
}));

productRoutes.post("/bulk/activate", requireAuth, requireMerchant, asyncHandler(async (_req, res) => {
  const products = await activateAllProducts();
  res.json({ data: products });
}));

productRoutes.get("/", asyncHandler(async (req, res) => {
  const query = listProductsSchema.parse(req.query);
  const products = await listProducts(query);
  res.json({ data: products });
}));

productRoutes.post("/", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const body = createProductSchema.parse(req.body);
  const product = await createProduct(body);
  res.status(201).json({ data: product });
}));

productRoutes.patch("/:id/status", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const body = updateProductStatusSchema.parse(req.body);
  const product = await updateProductStatus(z.string().uuid().parse(req.params.id), body.status);
  res.json({ data: product });
}));

productRoutes.delete("/:id", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const product = await deleteProduct(z.string().uuid().parse(req.params.id));
  res.json({ data: product });
}));

productRoutes.patch("/specs/:specId/stock", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const body = updateSpecStockSchema.parse(req.body);
  const spec = await updateSpecStock(z.string().uuid().parse(req.params.specId), body.stock);
  res.json({ data: spec });
}));

productRoutes.patch("/specs/:specId", requireAuth, requireMerchant, asyncHandler(async (req, res) => {
  const body = updateProductSpecSchema.parse(req.body);
  const spec = await updateProductSpec(z.string().uuid().parse(req.params.specId), body);
  res.json({ data: spec });
}));

productRoutes.get("/:id", asyncHandler(async (req, res) => {
  const product = await getProductById(z.string().uuid().parse(req.params.id));
  res.json({ data: product });
}));
