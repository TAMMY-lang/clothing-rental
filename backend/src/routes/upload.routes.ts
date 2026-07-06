import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { requireAuth, requireMerchant } from "../middleware/auth.js";
import { AppError } from "../utils/app-error.js";

const uploadDir = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function sanitizeFileName(value: string) {
  return value
    .replace(/[^\w.\-\u4e00-\u9fa5]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    callback(null, uploadDir);
  },
  filename: (req, file, callback) => {
    const productId = sanitizeFileName(String(req.body.productId || "draft-product"));
    const originalName = sanitizeFileName(Buffer.from(file.originalname, "latin1").toString("utf8"));
    callback(null, `${productId}_${Date.now()}_${originalName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new AppError("仅支持 jpg、png、webp 图片格式", 400, "INVALID_IMAGE_TYPE"));
      return;
    }
    callback(null, true);
  }
});

export const uploadRoutes = Router();

uploadRoutes.post("/images", requireAuth, requireMerchant, upload.single("image"), (req, res) => {
  if (!req.file) {
    throw new AppError("请选择要上传的图片", 400, "IMAGE_REQUIRED");
  }
  const publicPath = `/uploads/${req.file.filename}`;
  const origin = req.get("origin");
  const baseUrl = origin || `${req.protocol}://${req.get("host")}`;
  res.status(201).json({
    data: {
      url: `${baseUrl}${publicPath}`,
      path: publicPath,
      filename: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype
    }
  });
});
