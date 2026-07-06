import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error?.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({
      message: "图片大小不能超过 5MB",
      code: "IMAGE_TOO_LARGE"
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      message: "请求参数校验失败",
      code: "VALIDATION_ERROR",
      details: error.flatten()
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      message: error.message,
      code: error.code
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({
        message: "数据唯一性冲突，请检查是否重复提交或档期已被占用",
        code: "UNIQUE_CONSTRAINT_FAILED"
      });
      return;
    }
  }

  console.error(error);
  res.status(500).json({
    message: "服务器内部错误",
    code: "INTERNAL_SERVER_ERROR"
  });
};
