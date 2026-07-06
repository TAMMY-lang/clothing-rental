import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

const scoreSchema = z.coerce.number().int().min(1).max(5);

export const createProductReviewSchema = z.object({
  overallScore: scoreSchema,
  cleanlinessScore: scoreSchema,
  sizeAccuracyScore: scoreSchema,
  matchScore: scoreSchema,
  content: z.string().min(6).max(1000),
  images: z.array(z.string().url()).min(1, "请至少上传一张上身实拍图")
});

export const reviewAuditSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(500).optional()
});

export const merchantReplySchema = z.object({
  reply: z.string().min(2).max(1000)
});

export const tenantReviewSchema = z.object({
  careScore: scoreSchema,
  comment: z.string().max(500).optional()
});

function parseImages(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatReview<T extends { images: string }>(review: T) {
  return {
    ...review,
    images: parseImages(review.images)
  };
}

const reviewInclude = {
  user: { select: { id: true, name: true, phone: true } },
  product: { select: { id: true, name: true, category: true } },
  spec: { select: { id: true, skuCode: true, color: true, size: true } },
  order: { select: { id: true, status: true, rentStartDate: true, rentEndDate: true } }
};

export async function listApprovedProductReviews(productId: string) {
  const reviews = await prisma.productReview.findMany({
    where: { productId, status: "APPROVED" },
    include: reviewInclude,
    orderBy: { createdAt: "desc" }
  });
  return reviews.map(formatReview);
}

export async function listMerchantReviews() {
  const reviews = await prisma.productReview.findMany({
    include: reviewInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });
  return reviews.map(formatReview);
}

export async function createProductReview(userId: string, orderId: string, input: z.infer<typeof createProductReviewSchema>) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { productReview: true }
  });
  if (!order || order.userId !== userId) {
    throw new AppError("订单不存在或无权评价", 404, "ORDER_NOT_FOUND");
  }
  if (order.status !== "COMPLETED") {
    throw new AppError("订单完成后才可以评价", 400, "ORDER_NOT_COMPLETED");
  }
  if (order.productReview) {
    throw new AppError("该订单已评价", 409, "REVIEW_EXISTS");
  }
  const review = await prisma.productReview.create({
    data: {
      orderId,
      userId,
      productId: order.productId,
      specId: order.specId,
      overallScore: input.overallScore,
      cleanlinessScore: input.cleanlinessScore,
      sizeAccuracyScore: input.sizeAccuracyScore,
      matchScore: input.matchScore,
      content: input.content.trim(),
      images: JSON.stringify(input.images),
      status: "PENDING"
    },
    include: reviewInclude
  });
  return formatReview(review);
}

export async function auditProductReview(merchantId: string, reviewId: string, input: z.infer<typeof reviewAuditSchema>) {
  const review = await prisma.productReview.update({
    where: { id: reviewId },
    data: {
      status: input.status,
      reviewedAt: new Date(),
      reviewedById: merchantId,
      merchantReply: input.status === "REJECTED" ? input.reason : undefined
    },
    include: reviewInclude
  });
  return formatReview(review);
}

export async function replyProductReview(reviewId: string, reply: string) {
  const review = await prisma.productReview.update({
    where: { id: reviewId },
    data: { merchantReply: reply.trim() },
    include: reviewInclude
  });
  return formatReview(review);
}

export async function createTenantReview(merchantId: string, orderId: string, input: z.infer<typeof tenantReviewSchema>) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tenantReview: true }
  });
  if (!order) {
    throw new AppError("订单不存在", 404, "ORDER_NOT_FOUND");
  }
  if (order.status !== "COMPLETED") {
    throw new AppError("订单完成后才可以评价租客", 400, "ORDER_NOT_COMPLETED");
  }
  if (order.tenantReview) {
    throw new AppError("该订单已评价租客", 409, "TENANT_REVIEW_EXISTS");
  }
  return prisma.merchantTenantReview.create({
    data: {
      orderId,
      merchantId,
      customerId: order.userId,
      careScore: input.careScore,
      comment: input.comment?.trim()
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      merchant: { select: { id: true, name: true, phone: true } },
      order: { select: { id: true, productId: true, status: true } }
    }
  });
}
