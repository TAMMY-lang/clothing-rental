import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { verifyPaymentPassword } from "./auth.service.js";
import { confirmPayment } from "./order.service.js";

export const paymentCallbackSchema = z.object({
  orderId: z.string().uuid(),
  transactionId: z.string().optional(),
  status: z.enum(["SUCCESS", "FAILED"]).default("SUCCESS"),
  rawPayload: z.unknown().optional()
});

export const refundSchema = z.object({
  amount: z.coerce.number().min(0),
  reason: z.string().default("押金退款")
});

export const createWechatPaymentSchema = z.object({
  paymentPassword: z.string().regex(/^\d{6}$/, "支付密码必须是 6 位数字")
});

export async function createWechatPayment(orderId: string, userId: string, paymentPassword: string) {
  await verifyPaymentPassword(userId, { paymentPassword });
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { payments: true }
  });
  if (!order) {
    throw new AppError("订单不存在", 404, "ORDER_NOT_FOUND");
  }
  if (!["PENDING", "PENDING_PAYMENT"].includes(order.status)) {
    throw new AppError("只有待付款订单可以发起支付", 400, "INVALID_ORDER_STATUS");
  }

  const payment = await prisma.payment.create({
    data: {
      orderId,
      userId,
      amount: order.totalAmount,
      method: "WECHAT",
      status: "PENDING",
      rawPayload: JSON.stringify({
        mode: "MOCK_WECHAT_PAY",
        note: "填入微信支付商户配置后可替换为真实统一下单参数"
      })
    }
  });

  return {
    paymentId: payment.id,
    orderId,
    amount: payment.amount,
    mock: true,
    payParams: {
      appId: process.env.WECHAT_APP_ID ?? "mock-appid",
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: payment.id.slice(0, 16),
      package: `prepay_id=mock_${payment.id}`,
      signType: "RSA",
      paySign: "mock-pay-sign"
    }
  };
}

export async function handleWechatCallback(input: z.infer<typeof paymentCallbackSchema>) {
  const payment = await prisma.payment.findFirst({
    where: { orderId: input.orderId },
    orderBy: { createdAt: "desc" }
  });
  if (!payment) {
    throw new AppError("支付记录不存在", 404, "PAYMENT_NOT_FOUND");
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: input.status,
      transactionId: input.transactionId,
      rawPayload: JSON.stringify(input.rawPayload ?? input)
    }
  });

  if (input.status === "SUCCESS") {
    return confirmPayment(input.orderId);
  }

  return prisma.order.findUniqueOrThrow({ where: { id: input.orderId } });
}

export async function createRefund(orderId: string, input: z.infer<typeof refundSchema>) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new AppError("订单不存在", 404, "ORDER_NOT_FOUND");
  }

  return prisma.payment.create({
    data: {
      orderId,
      userId: order.userId,
      amount: input.amount,
      type: "DEPOSIT_REFUND",
      method: "WECHAT",
      status: "SUCCESS",
      refundAmount: input.amount,
      rawPayload: JSON.stringify({
        mode: "MOCK_REFUND",
        reason: input.reason
      })
    }
  });
}
