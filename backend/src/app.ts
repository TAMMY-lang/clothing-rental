import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { availabilityRoutes } from "./routes/availability.routes.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { chatRoutes } from "./routes/chat.routes.js";
import { customerRoutes } from "./routes/customer.routes.js";
import { orderRoutes } from "./routes/order.routes.js";
import { paymentRoutes } from "./routes/payment.routes.js";
import { productRoutes } from "./routes/product.routes.js";
import { reviewRoutes } from "./routes/review.routes.js";
import { shopRoutes } from "./routes/shop.routes.js";
import { uploadRoutes } from "./routes/upload.routes.js";
import { userRoutes } from "./routes/user.routes.js";

export function createApp() {
  const app = express();
  app.disable("etag");

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN }));
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });
  app.use(express.json({ limit: "5mb" }));
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  app.use(morgan("dev", {
    skip: (_req, res) => res.statusCode < 400
  }));

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "clothing-rental-backend"
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/chats", chatRoutes);
  app.use("/api/customer", customerRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/availability", availabilityRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/shop", shopRoutes);
  app.use("/api/uploads", uploadRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
