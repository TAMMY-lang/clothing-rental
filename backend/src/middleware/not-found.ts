import type { RequestHandler } from "express";

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({
    message: `接口不存在：${req.method} ${req.path}`,
    code: "NOT_FOUND"
  });
};
