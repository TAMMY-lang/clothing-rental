import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { getDateRange, getInclusiveDays, isWithinLast24HoursBeforeEnd, toDateOnly } from "../utils/date.js";
import { assertSpecAvailable } from "./availability.service.js";

export const createOrderSchema = z.object({
  productId: z.string().uuid(),
  specId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  totalPrice: z.coerce.number().positive(),
  shippingMethod: z.enum(["PICKUP", "EXPRESS"]).default("PICKUP"),
  shippingAddress: z.string().optional(),
  pickupLocation: z.string().optional(),
  expressFee: z.coerce.number().min(0).default(0),
  orderType: z.enum(["RENTAL", "TRY_ON"]).default("RENTAL"),
  tryOnQuantity: z.coerce.number().int().min(0).default(0)
});

const REMOTE_EXPRESS_REGIONS = ["新疆", "西藏", "内蒙古", "青海", "宁夏", "甘肃", "海南", "香港", "澳门", "台湾"];
const REMOTE_EXPRESS_FEE = 30;

function isRemoteExpressAddress(address = "") {
  return REMOTE_EXPRESS_REGIONS.some((region) => address.includes(region));
}

function calculateExpressFee(method: "PICKUP" | "EXPRESS", address?: string) {
  if (method !== "EXPRESS") return 0;
  return isRemoteExpressAddress(address) ? REMOTE_EXPRESS_FEE : 0;
}

export const listOrdersSchema = z.object({
  userId: z.string().optional(),
  status: z.string().optional()
});

export const requestExtensionSchema = z.object({
  type: z.enum(["NORMAL", "FORCE_MAJEURE"]),
  extensionDays: z.coerce.number().int().min(1).max(7),
  extensionFee: z.coerce.number().min(0).optional(),
  proof: z.string().optional()
});

export const reviewExtensionSchema = z.object({
  approved: z.boolean(),
  rejectReason: z.string().optional()
});

export const inspectReturnSchema = z.object({
  cleaningFee: z.coerce.number().min(0).default(0)
});

export const adjustPriceSchema = z.object({
  totalPrice: z.coerce.number().positive(),
  reason: z.string().min(1).default("商家拍后改价")
});

export const delayShipmentSchema = z.object({
  delayedUntil: z.string(),
  reason: z.string().min(1).default("商家延期发货")
});

export const shipOrderSchema = z.object({
  logisticsCompany: z.string().min(1, "请填写快递名称"),
  logisticsTrackingNumber: z.string().min(4, "请填写快递单号")
});

export const tryOnDecisionSchema = z.object({
  decision: z.enum(["RENT", "NO_RENT"])
});

export const interceptShipmentSchema = z.object({
  reason: z.string().min(1).default("用户申请快递拦截退回")
});

function parseStringArray(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseLogisticsHistory(value: string | undefined): Array<{ time: string; status: string; description: string }> {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildLogisticsHistory(company: string, trackingNumber: string) {
  const now = new Date();
  return [
    {
      time: now.toISOString(),
      status: "已发货",
      description: `${company} 已揽收，运单号 ${trackingNumber}`
    },
    {
      time: new Date(now.getTime() + 20 * 60 * 1000).toISOString(),
      status: "运输中",
      description: "包裹已离开发货仓，正在发往目的地城市"
    }
  ];
}

async function getSettlementDays() {
  const setting = await prisma.shopSetting.findFirst({ orderBy: { updatedAt: "desc" } });
  if (setting) return setting.settlementDays;
  const created = await prisma.shopSetting.create({ data: { settlementDays: 7 } });
  return created.settlementDays;
}

function formatOrder<T extends {
  rentStartDate: Date;
  rentEndDate: Date;
  totalAmount: number;
  product?: { tags: string; images: string } | null;
}>(order: T) {
  return {
    ...order,
    startDate: order.rentStartDate.toISOString().slice(0, 10),
    endDate: order.rentEndDate.toISOString().slice(0, 10),
    totalPrice: order.totalAmount,
    logisticsHistory: parseLogisticsHistory((order as { logisticsHistory?: string }).logisticsHistory),
    product: order.product
      ? {
        ...order.product,
        tags: parseStringArray(order.product.tags),
        images: parseStringArray(order.product.images)
      }
      : order.product
  };
}

function parseFeeRules(value: string | undefined): Array<{ style: string; quantity: number; fee: number }> {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function calculateTryOnFee(style: string | null | undefined, quantity: number) {
  if (quantity <= 0) return 0;
  const setting = await prisma.tryOnSetting.findFirst({ where: { enabled: true }, orderBy: { updatedAt: "desc" } });
  if (!setting) {
    throw new AppError("试穿服务暂未开启", 400, "TRY_ON_DISABLED");
  }
  const rules = parseFeeRules(setting?.feeRules);
  const normalizedStyle = style || "";
  const byClosestQuantity = (items: Array<{ style: string; quantity: number; fee: number }>) =>
    items.filter((rule) => rule.quantity <= quantity).sort((a, b) => b.quantity - a.quantity)[0];
  const exact = rules.find((rule) => rule.style === normalizedStyle && rule.quantity === quantity);
  const styleRule = byClosestQuantity(rules.filter((rule) => rule.style === normalizedStyle));
  const defaultExact = rules.find((rule) => rule.style === "默认" && rule.quantity === quantity);
  const defaultRule = byClosestQuantity(rules.filter((rule) => rule.style === "默认"));
  const fallbackExact = rules.find((rule) => rule.quantity === quantity);
  const fallbackRule = byClosestQuantity(rules);
  return exact?.fee ?? styleRule?.fee ?? defaultExact?.fee ?? defaultRule?.fee ?? fallbackExact?.fee ?? fallbackRule?.fee ?? 30 * quantity;
}

export async function createOrder(input: z.infer<typeof createOrderSchema>, userId = "1") {
  return prisma.$transaction(async (tx) => {
    const startDate = toDateOnly(input.startDate);
    const endDate = toDateOnly(input.endDate);
    const today = toDateOnly(new Date());

    if (startDate < today) {
      throw new AppError("起租日期不能早于今天", 400, "START_DATE_IN_PAST");
    }

    if (endDate < startDate) {
      throw new AppError("结束日期不能早于起租日期", 400, "INVALID_RENT_RANGE");
    }

    const product = await tx.product.findFirst({
      where: {
        id: input.productId,
        status: "ACTIVE"
      }
    });

    if (!product) {
      throw new AppError("商品不存在", 404, "PRODUCT_NOT_FOUND");
    }

    if (input.shippingMethod === "EXPRESS" && !input.shippingAddress) {
      throw new AppError("快递发货需填写收货地址", 400, "SHIPPING_ADDRESS_REQUIRED");
    }

    const spec = await tx.productSpec.findFirst({
      where: {
        id: input.specId,
        productId: input.productId
      }
    });

    if (!spec) {
      throw new AppError("商品规格不存在", 404, "SPEC_NOT_FOUND");
    }

    if (spec.stock <= 0) {
      throw new AppError("库存不足", 409, "OUT_OF_STOCK");
    }

    const { dates, rentalDays } = await assertSpecAvailable({
      productId: input.productId,
      specId: input.specId,
      rentStartDate: input.startDate,
      rentEndDate: input.endDate
    }, tx);

    const tryOnQuantity = input.orderType === "TRY_ON" ? Math.max(input.tryOnQuantity || 1, 1) : 0;
    const tryOnFee = input.orderType === "TRY_ON" ? await calculateTryOnFee(product.style, tryOnQuantity) : 0;
    const expressFee = calculateExpressFee(input.shippingMethod, input.shippingAddress);
    const rentalFee = product.dailyRentalPrice;
    const deposit = product.depositAmount;
    const totalAmount = rentalFee + deposit + expressFee + tryOnFee;

    if (Math.abs(totalAmount - input.totalPrice) > 0.01) {
      throw new AppError("订单总价校验失败，请刷新页面后重试：总价应为周期租金 + 押金 + 快递费", 400, "TOTAL_PRICE_MISMATCH");
    }

    await tx.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        name: "体验用户",
        phone: `guest-${userId.slice(0, 8)}`
      }
    });

    return tx.order.create({
      data: {
        userId,
        productId: input.productId,
        specId: input.specId,
        rentStartDate: startDate,
        rentEndDate: endDate,
        rentalDays,
        rentalFee,
        deposit,
        totalAmount,
        status: "PENDING",
        orderType: input.orderType,
        tryOnFee,
        tryOnQuantity,
        shippingMethod: input.shippingMethod,
        shippingAddress: input.shippingAddress,
        pickupLocation: input.pickupLocation,
        expressFee,
        bookings: {
          create: dates.map((bookedDate) => ({
            productId: input.productId,
            specId: input.specId,
            bookedDate
          }))
        }
      },
      include: { product: true, spec: true, bookings: true }
    }).then(formatOrder);
  });
}

export async function decideTryOnOrder(id: string, input: z.infer<typeof tryOnDecisionSchema>, userId?: string) {
  const order = await getOrder(id);
  if (userId && order.userId !== userId) {
    throw new AppError("只能处理自己的试穿订单", 403, "FORBIDDEN_TRY_ON_DECISION");
  }
  if (order.orderType !== "TRY_ON") {
    throw new AppError("只有试穿订单可以处理试穿结果", 400, "NOT_TRY_ON_ORDER");
  }
  if (order.tryOnDecision) {
    throw new AppError("试穿结果已提交，不能重复修改", 400, "TRY_ON_DECISION_EXISTS");
  }
  const depositRefund = input.decision === "RENT"
    ? order.deposit + order.tryOnFee
    : order.deposit + order.rentalFee;
  const updated = await prisma.order.update({
    where: { id },
    data: {
      tryOnDecision: input.decision,
      status: "PENDING_RETURN",
      depositRefund
    },
    include: {
      product: true,
      spec: true,
      extensionReviews: { orderBy: { createdAt: "desc" } }
    }
  });
  return formatOrder(updated);
}

export async function interceptShipment(id: string, input: z.infer<typeof interceptShipmentSchema>) {
  const order = await getOrder(id);
  if (!["PENDING", "PENDING_PAYMENT", "PENDING_SHIPMENT", "RENTING"].includes(order.status)) {
    throw new AppError("当前订单状态不能申请快递拦截", 400, "INVALID_ORDER_STATUS");
  }
  const refundAmount = order.totalAmount;
  const updated = await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        orderId: id,
        userId: order.userId,
        amount: refundAmount,
        type: "INTERCEPT_REFUND",
        method: "MOCK",
        status: "SUCCESS",
        refundAmount,
        rawPayload: JSON.stringify({ reason: input.reason })
      }
    });
    return tx.order.update({
      where: { id },
      data: {
        status: "CANCELED",
        interceptStatus: "RETURNED_REFUNDED",
        interceptReason: input.reason,
        interceptRefund: refundAmount,
        interceptedAt: new Date()
      },
      include: {
        product: true,
        spec: true,
        extensionReviews: { orderBy: { createdAt: "desc" } }
      }
    });
  });
  return formatOrder(updated);
}

export async function listOrders(query: z.infer<typeof listOrdersSchema>, userId = query.userId) {
  const orders = await prisma.order.findMany({
    where: {
      userId,
      status: query.status
    },
    include: {
      product: true,
      spec: true,
      extensionReviews: { orderBy: { createdAt: "desc" } }
    },
    orderBy: { createdAt: "desc" }
  });
  return orders.map(formatOrder);
}

export async function getOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      product: true,
      spec: true,
      bookings: true,
      extensionReviews: { orderBy: { createdAt: "desc" } }
    }
  });
  if (!order) {
    throw new AppError("订单不存在", 404, "ORDER_NOT_FOUND");
  }
  return formatOrder(order);
}

export async function confirmPayment(id: string) {
  const order = await getOrder(id);
  if (!["PENDING", "PENDING_PAYMENT"].includes(order.status)) {
    throw new AppError("只有待付款订单可以确认支付", 400, "INVALID_ORDER_STATUS");
  }
  const paidOrder = await prisma.order.update({
    where: { id },
    data: { status: order.shippingMethod === "EXPRESS" ? "PENDING_SHIPMENT" : "RENTING" },
    include: {
      product: true,
      spec: true,
      extensionReviews: { orderBy: { createdAt: "desc" } }
    }
  });
  return formatOrder(paidOrder);
}

export async function markAsRenting(id: string, input: z.infer<typeof shipOrderSchema>) {
  const order = await getOrder(id);
  if (order.status !== "PENDING_SHIPMENT") {
    throw new AppError("只有待发货订单可以进入租赁中", 400, "INVALID_ORDER_STATUS");
  }
  if (order.shippingMethod !== "EXPRESS") {
    throw new AppError("只有快递订单需要填写物流信息", 400, "NOT_EXPRESS_ORDER");
  }
  const history = buildLogisticsHistory(input.logisticsCompany, input.logisticsTrackingNumber);
  const shippedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: "RENTING",
      logisticsCompany: input.logisticsCompany,
      logisticsTrackingNumber: input.logisticsTrackingNumber,
      logisticsStatus: "运输中",
      logisticsHistory: JSON.stringify(history),
      shippedAt: new Date()
    },
    include: {
      product: true,
      spec: true,
      extensionReviews: { orderBy: { createdAt: "desc" } }
    }
  });
  return formatOrder(shippedOrder);
}

export async function refreshLogistics(id: string) {
  const order = await getOrder(id);
  if (!order.logisticsCompany || !order.logisticsTrackingNumber) {
    throw new AppError("该订单暂无物流信息", 400, "NO_LOGISTICS_INFO");
  }
  const currentHistory = parseLogisticsHistory(JSON.stringify(order.logisticsHistory));
  const hasDelivering = currentHistory.some((item) => item.status === "派送中");
  const hasDelivered = currentHistory.some((item) => item.status === "已签收");
  const now = new Date();
  const nextHistory = [...currentHistory];
  let nextStatus = order.logisticsStatus ?? "运输中";
  if (!hasDelivering) {
    nextStatus = "派送中";
    nextHistory.push({
      time: now.toISOString(),
      status: "派送中",
      description: "包裹已到达目的地网点，快递员正在派送"
    });
  } else if (!hasDelivered) {
    nextStatus = "已签收";
    nextHistory.push({
      time: now.toISOString(),
      status: "已签收",
      description: "包裹已完成签收，请检查服装状态并按期使用"
    });
  }
  const updated = await prisma.order.update({
    where: { id },
    data: {
      logisticsStatus: nextStatus,
      logisticsHistory: JSON.stringify(nextHistory)
    },
    include: {
      product: true,
      spec: true,
      extensionReviews: { orderBy: { createdAt: "desc" } }
    }
  });
  return formatOrder(updated);
}

export async function requestReturn(id: string) {
  const order = await getOrder(id);
  if (!["RENTING", "EXTENSION_APPROVED"].includes(order.status)) {
    throw new AppError("当前订单状态不能发起归还", 400, "INVALID_ORDER_STATUS");
  }
  const returnOrder = await prisma.order.update({
    where: { id },
    data: {
      status: "PENDING_RETURN",
      returnRequestedAt: new Date()
    },
    include: {
      product: true,
      spec: true,
      extensionReviews: { orderBy: { createdAt: "desc" } }
    }
  });
  return formatOrder(returnOrder);
}

export async function inspectReturn(id: string, input: z.infer<typeof inspectReturnSchema>) {
  const order = await getOrder(id);
  if (!["PENDING_RETURN", "PENDING_INSPECTION"].includes(order.status)) {
    throw new AppError("只有待验收订单可以进行验收", 400, "INVALID_ORDER_STATUS");
  }
  const cleaningFee = input.cleaningFee;
  if (cleaningFee > order.deposit) {
    throw new AppError("清洁费不能超过押金", 400, "CLEANING_FEE_EXCEEDS_DEPOSIT");
  }

  const settlementDays = await getSettlementDays();
  const settlementDate = new Date();
  settlementDate.setDate(settlementDate.getDate() + settlementDays);
  const depositRefund = order.deposit - cleaningFee;
  const completedOrder = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: {
        status: "SETTLING",
        settlementStatus: "SETTLING",
        settlementDate,
        inspectedAt: new Date(),
        cleaningFee,
        depositRefund
      },
      include: {
        product: true,
        spec: true,
        extensionReviews: { orderBy: { createdAt: "desc" } }
      }
    });
    const wallet = await tx.merchantWallet.findFirst() ?? await tx.merchantWallet.create({ data: {} });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "DEPOSIT_REFUND",
        amount: -depositRefund,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance,
        orderId: id,
        note: "押金退还给用户，不进入商家余额"
      }
    });
    return updated;
  });
  return formatOrder(completedOrder);
}

export async function cancelOrder(id: string) {
  const order = await getOrder(id);
  if (!["PENDING", "PENDING_PAYMENT", "PENDING_SHIPMENT"].includes(order.status)) {
    throw new AppError("当前订单状态不能取消", 400, "INVALID_ORDER_STATUS");
  }
  return prisma.$transaction(async (tx) => {
    await tx.inventoryBooking.deleteMany({ where: { orderId: id } });
    const canceledOrder = await tx.order.update({
      where: { id },
      data: { status: "CANCELED" },
      include: {
        product: true,
        spec: true,
        extensionReviews: { orderBy: { createdAt: "desc" } }
      }
    });
    return formatOrder(canceledOrder);
  });
}

export async function requestExtension(id: string, input: z.infer<typeof requestExtensionSchema>) {
  const order = await getOrder(id);
  if (order.status !== "RENTING") {
    throw new AppError("当前订单状态不能申请延期", 400, "INVALID_ORDER_STATUS");
  }
  if (input.type === "FORCE_MAJEURE" && !input.proof) {
    throw new AppError("不可抗力延期必须上传凭证", 400, "PROOF_REQUIRED");
  }

  const requestedEndDate = new Date(order.rentEndDate);
  requestedEndDate.setUTCDate(requestedEndDate.getUTCDate() + input.extensionDays);

  const totalDays = getInclusiveDays(order.rentStartDate, requestedEndDate);
  if (totalDays > 14) {
    throw new AppError("延期后连续租赁周期不能超过 14 天", 400, "RENT_DAYS_OUT_OF_RANGE");
  }

  const extensionFee = input.extensionFee ?? order.product.dailyRentalPrice * input.extensionDays;

  return prisma.$transaction(async (tx) => {
    const review = await tx.extensionReview.create({
      data: {
        orderId: id,
        type: input.type,
        requestedEndDate,
        proof: input.proof,
        fee: extensionFee
      }
    });

    await tx.order.update({
      where: { id },
      data: {
        status: "PENDING_EXTENSION",
        extensionType: input.type,
        extensionProof: input.proof,
        extensionDays: input.extensionDays,
        extensionFee
      }
    });

    const updatedOrder = await tx.order.findUnique({
      where: { id },
      include: {
        product: true,
        spec: true,
        extensionReviews: { orderBy: { createdAt: "desc" } }
      }
    });
    return {
      review,
      order: updatedOrder ? formatOrder(updatedOrder) : null
    };
  });
}

export async function reviewExtension(id: string, input: z.infer<typeof reviewExtensionSchema>) {
  const order = await getOrder(id);
  const review = order.extensionReviews[0];
  if (!review || review.status !== "PENDING") {
    throw new AppError("没有待审核的延期申请", 400, "NO_PENDING_EXTENSION");
  }

  if (!input.approved) {
    return prisma.$transaction(async (tx) => {
      await tx.extensionReview.update({
        where: { id: review.id },
        data: {
          status: "REJECTED",
          rejectReason: input.rejectReason,
          reviewedAt: new Date()
        }
      });
      const rejectedOrder = await tx.order.update({
        where: { id },
        data: {
          status: "RENTING",
          extensionType: null,
          extensionProof: null,
          extensionDays: null,
          extensionFee: null
        },
        include: {
          product: true,
          spec: true,
          extensionReviews: { orderBy: { createdAt: "desc" } }
        }
      });
      return formatOrder(rejectedOrder);
    });
  }

  return approveExtension(id, review.id);
}

export async function adjustOrderPrice(id: string, input: z.infer<typeof adjustPriceSchema>) {
  const order = await getOrder(id);
  if (!["PENDING", "PENDING_PAYMENT"].includes(order.status)) {
    throw new AppError("只有待付款订单可以拍后改价", 400, "INVALID_ORDER_STATUS");
  }
  if (input.totalPrice < order.deposit) {
    throw new AppError("改价后总价不能低于押金", 400, "INVALID_ADJUSTED_PRICE");
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      originalTotalAmount: order.originalTotalAmount ?? order.totalAmount,
      totalAmount: input.totalPrice,
      rentalFee: input.totalPrice - order.deposit,
      priceAdjustmentReason: input.reason
    },
    include: {
      product: true,
      spec: true,
      extensionReviews: { orderBy: { createdAt: "desc" } }
    }
  });
  return formatOrder(updatedOrder);
}

export async function delayShipment(id: string, input: z.infer<typeof delayShipmentSchema>) {
  const order = await getOrder(id);
  if (!["PENDING", "PENDING_PAYMENT", "RENTING"].includes(order.status)) {
    throw new AppError("当前订单状态不能延期发货", 400, "INVALID_ORDER_STATUS");
  }

  const delayedUntil = toDateOnly(input.delayedUntil);
  if (delayedUntil < toDateOnly(new Date())) {
    throw new AppError("延期发货日期不能早于今天", 400, "INVALID_DELAY_DATE");
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      shipmentDelayedUntil: delayedUntil,
      shipmentDelayReason: input.reason
    },
    include: {
      product: true,
      spec: true,
      extensionReviews: { orderBy: { createdAt: "desc" } }
    }
  });
  return formatOrder(updatedOrder);
}

export async function payNormalExtension(id: string) {
  const order = await getOrder(id);
  const review = order.extensionReviews[0];
  if (!review || review.type !== "NORMAL" || review.status !== "PENDING") {
    throw new AppError("没有待支付的普通延期申请", 400, "NO_PENDING_NORMAL_EXTENSION");
  }

  return approveExtension(id, review.id);
}

export async function reviewForceMajeureExtension(
  id: string,
  input: z.infer<typeof reviewExtensionSchema>
) {
  const order = await getOrder(id);
  const review = order.extensionReviews[0];
  if (!review || review.type !== "FORCE_MAJEURE" || review.status !== "PENDING") {
    throw new AppError("没有待审核的不可抗力延期申请", 400, "NO_PENDING_FORCE_MAJEURE_EXTENSION");
  }

  if (!input.approved) {
    return prisma.$transaction(async (tx) => {
      await tx.extensionReview.update({
        where: { id: review.id },
        data: {
          status: "REJECTED",
          rejectReason: input.rejectReason,
          reviewedAt: new Date()
        }
      });
      const rejectedOrder = await tx.order.update({
        where: { id },
        data: { status: "RENTING" },
        include: {
          product: true,
          spec: true,
          extensionReviews: { orderBy: { createdAt: "desc" } }
        }
      });
      return formatOrder(rejectedOrder);
    });
  }

  return approveExtension(id, review.id);
}

async function approveExtension(orderId: string, reviewId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { product: true, extensionReviews: { where: { id: reviewId } } }
    });
    const review = order?.extensionReviews[0];
    if (!order || !review) {
      throw new AppError("延期申请不存在", 404, "EXTENSION_NOT_FOUND");
    }

    const extensionStart = new Date(order.rentEndDate);
    extensionStart.setUTCDate(extensionStart.getUTCDate() + 1);
    const newDates = getDateRange(extensionStart, review.requestedEndDate);

    await assertSpecAvailable({
      productId: order.productId,
      specId: order.specId,
      rentStartDate: extensionStart.toISOString(),
      rentEndDate: review.requestedEndDate.toISOString()
    }, tx);

    await tx.inventoryBooking.createMany({
      data: newDates.map((bookedDate) => ({
        productId: order.productId,
        specId: order.specId,
        orderId: order.id,
        bookedDate
      }))
    });

    await tx.extensionReview.update({
      where: { id: reviewId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date()
      }
    });

    const approvedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        rentEndDate: review.requestedEndDate,
        rentalDays: getInclusiveDays(order.rentStartDate, review.requestedEndDate),
        rentalFee: order.product.dailyRentalPrice * getInclusiveDays(order.rentStartDate, review.requestedEndDate),
        totalAmount: order.product.dailyRentalPrice * getInclusiveDays(order.rentStartDate, review.requestedEndDate) + order.deposit,
        status: "RENTING"
      },
      include: {
        product: true,
        spec: true,
        extensionReviews: { orderBy: { createdAt: "desc" } }
      }
    });
    return formatOrder(approvedOrder);
  });
}
