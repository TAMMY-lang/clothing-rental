import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

export const updateAnnouncementSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  enabled: z.boolean().default(true)
});

export const createCouponSchema = z.object({
  title: z.string().min(1),
  code: z.string().min(2),
  type: z.literal("AMOUNT").default("AMOUNT"),
  discountAmount: z.coerce.number().positive("满减券需要填写大于 0 的减免金额"),
  minOrderAmount: z.coerce.number().positive("满减券需要填写大于 0 的使用门槛"),
  usageLimit: z.coerce.number().int().positive().optional(),
  enabled: z.boolean().default(true)
}).superRefine((input, ctx) => {
  if (input.discountAmount >= input.minOrderAmount) {
    ctx.addIssue({ code: "custom", path: ["discountAmount"], message: "减免金额必须小于使用门槛" });
  }
});

export const updateCouponStatusSchema = z.object({
  enabled: z.boolean()
});

export const createWithdrawalSchema = z.object({
  amount: z.coerce.number().positive(),
  methodId: z.string().uuid().optional(),
  accountName: z.string().min(1).optional(),
  accountNo: z.string().min(4).optional()
});

export const updateSettlementSettingSchema = z.object({
  settlementDays: z.coerce.number().int().min(0).max(60).optional(),
  minWithdrawalAmount: z.coerce.number().min(0).optional(),
  withdrawalFeePercent: z.coerce.number().min(0).max(100).optional(),
  withdrawalFeeFixed: z.coerce.number().min(0).optional()
});

export const createWithdrawalMethodSchema = z.object({
  channel: z.enum(["BANK", "ALIPAY", "WECHAT"]),
  accountName: z.string().min(1),
  accountNo: z.string().min(1),
  bankName: z.string().optional(),
  qrCode: z.string().optional(),
  isDefault: z.boolean().default(false),
  enabled: z.boolean().default(true)
});

export const createMemberLevelSchema = z.object({
  name: z.string().min(1),
  minSpend: z.coerce.number().min(0).default(0),
  discountPercent: z.coerce.number().min(1).max(100).default(100),
  benefits: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0)
});

export const updateTryOnSettingSchema = z.object({
  enabled: z.boolean().default(true),
  feeRules: z.array(z.object({
    style: z.string().min(1),
    quantity: z.coerce.number().int().min(1),
    fee: z.coerce.number().min(0)
  })).default([]),
  processNote: z.string().min(1),
  careNotice: z.string().min(1)
});

export const createReturnAddressSchema = z.object({
  label: z.string().min(1),
  receiver: z.string().min(1),
  phone: z.string().min(5),
  address: z.string().min(5),
  isDefault: z.boolean().default(false),
  enabled: z.boolean().default(true)
});

export async function getAnnouncement() {
  const announcement = await prisma.shopAnnouncement.findFirst({
    where: { enabled: true },
    orderBy: { updatedAt: "desc" }
  });

  if (announcement) {
    return announcement;
  }

  return prisma.shopAnnouncement.create({
    data: {
      title: "店铺公告",
      content: "欢迎使用服装租赁小程序，当前支持婚纱、西服、秀禾服等品类租赁。",
      enabled: true
    }
  });
}

export async function updateAnnouncement(input: z.infer<typeof updateAnnouncementSchema>) {
  const existing = await prisma.shopAnnouncement.findFirst({
    orderBy: { updatedAt: "desc" }
  });

  if (!existing) {
    return prisma.shopAnnouncement.create({ data: input });
  }

  return prisma.shopAnnouncement.update({
    where: { id: existing.id },
    data: input
  });
}

export async function listCoupons(onlyEnabled = false) {
  return prisma.coupon.findMany({
    where: onlyEnabled ? { enabled: true } : undefined,
    orderBy: { createdAt: "desc" }
  });
}

export async function createCoupon(input: z.infer<typeof createCouponSchema>) {
  return prisma.coupon.create({
    data: {
      title: input.title,
      code: input.code.toUpperCase(),
      type: "AMOUNT",
      discountAmount: input.discountAmount,
      discountPercent: undefined,
      minOrderAmount: input.minOrderAmount,
      usageLimit: input.usageLimit,
      enabled: input.enabled
    }
  });
}

export async function updateCouponStatus(id: string, enabled: boolean) {
  return prisma.coupon.update({
    where: { id },
    data: { enabled }
  });
}

async function ensureWallet() {
  const existing = await prisma.merchantWallet.findFirst();
  if (existing) return existing;
  return prisma.merchantWallet.create({ data: {} });
}

export async function getMerchantWallet() {
  await settleDueOrders();
  return ensureWallet();
}

export async function listWithdrawals() {
  return prisma.withdrawal.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createWithdrawal(input: z.infer<typeof createWithdrawalSchema>) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.merchantWallet.findFirst() ?? await tx.merchantWallet.create({ data: {} });
    const setting = await tx.shopSetting.findFirst({ orderBy: { updatedAt: "desc" } })
      ?? await tx.shopSetting.create({ data: { settlementDays: 7, minWithdrawalAmount: 100, withdrawalFeePercent: 0, withdrawalFeeFixed: 0 } });
    const method = input.methodId
      ? await tx.withdrawalMethod.findFirst({ where: { id: input.methodId, enabled: true } })
      : await tx.withdrawalMethod.findFirst({ where: { enabled: true }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
    if (!method && (!input.accountName || !input.accountNo)) {
      throw new AppError("请先绑定提现方式", 400, "WITHDRAWAL_METHOD_REQUIRED");
    }
    if (input.amount < setting.minWithdrawalAmount) {
      throw new AppError(`最低提现金额为 ${setting.minWithdrawalAmount} 元`, 400, "MIN_WITHDRAWAL_AMOUNT_NOT_MET");
    }
    if (input.amount > wallet.balance) {
      throw new AppError("提现金额不能超过可用余额", 400, "INSUFFICIENT_BALANCE");
    }
    const balanceBefore = wallet.balance;
    const balanceAfter = wallet.balance - input.amount;
    const withdrawal = await tx.withdrawal.create({
      data: {
        amount: input.amount,
        accountName: method?.accountName ?? input.accountName!,
        accountNo: method?.accountNo ?? input.accountNo!,
        channel: method?.channel ?? "BANK",
        channelAccount: method?.accountNo ?? input.accountNo!,
        channelName: method?.accountName ?? input.accountName!,
        methodId: method?.id,
        status: "PENDING"
      }
    });
    await tx.merchantWallet.update({
      where: { id: wallet.id },
      data: {
        balance: balanceAfter,
        frozen: wallet.frozen + input.amount
      }
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "WITHDRAWAL_DEDUCT",
        amount: -input.amount,
        balanceBefore,
        balanceAfter,
        withdrawalId: withdrawal.id,
        note: "商家申请提现，金额转入冻结"
      }
    });
    return withdrawal;
  });
}

export async function approveWithdrawal(id: string) {
  const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
  if (!withdrawal) throw new AppError("提现记录不存在", 404, "WITHDRAWAL_NOT_FOUND");
  if (withdrawal.status !== "PENDING") throw new AppError("只有待审核提现可以通过", 400, "INVALID_WITHDRAWAL_STATUS");
  return prisma.withdrawal.update({ where: { id }, data: { status: "APPROVED" } });
}

export async function completeWithdrawal(id: string) {
  return prisma.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) throw new AppError("提现记录不存在", 404, "WITHDRAWAL_NOT_FOUND");
    if (withdrawal.status !== "APPROVED") throw new AppError("只有已审核提现可以确认打款", 400, "INVALID_WITHDRAWAL_STATUS");
    const wallet = await tx.merchantWallet.findFirst() ?? await tx.merchantWallet.create({ data: {} });
    await tx.merchantWallet.update({
      where: { id: wallet.id },
      data: { frozen: Math.max(wallet.frozen - withdrawal.amount, 0) }
    });
    return tx.withdrawal.update({ where: { id }, data: { status: "COMPLETED" } });
  });
}

export async function rejectWithdrawal(id: string) {
  return prisma.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) throw new AppError("提现记录不存在", 404, "WITHDRAWAL_NOT_FOUND");
    if (!["PENDING", "APPROVED"].includes(withdrawal.status)) throw new AppError("当前提现状态不能驳回", 400, "INVALID_WITHDRAWAL_STATUS");
    const wallet = await tx.merchantWallet.findFirst() ?? await tx.merchantWallet.create({ data: {} });
    const balanceBefore = wallet.balance;
    const balanceAfter = wallet.balance + withdrawal.amount;
    await tx.merchantWallet.update({
      where: { id: wallet.id },
      data: {
        balance: balanceAfter,
        frozen: Math.max(wallet.frozen - withdrawal.amount, 0)
      }
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "WITHDRAWAL_REJECT_RELEASE",
        amount: withdrawal.amount,
        balanceBefore,
        balanceAfter,
        withdrawalId: withdrawal.id,
        note: "提现驳回，冻结金额释放回余额"
      }
    });
    return tx.withdrawal.update({ where: { id }, data: { status: "REJECTED" } });
  });
}

export async function getShopSetting() {
  const setting = await prisma.shopSetting.findFirst({ orderBy: { updatedAt: "desc" } });
  return setting ?? prisma.shopSetting.create({ data: { settlementDays: 7, minWithdrawalAmount: 100, withdrawalFeePercent: 0, withdrawalFeeFixed: 0 } });
}

export async function updateShopSetting(input: z.infer<typeof updateSettlementSettingSchema>) {
  const existing = await prisma.shopSetting.findFirst({ orderBy: { updatedAt: "desc" } });
  const data = {
    settlementDays: input.settlementDays,
    minWithdrawalAmount: input.minWithdrawalAmount,
    withdrawalFeePercent: input.withdrawalFeePercent,
    withdrawalFeeFixed: input.withdrawalFeeFixed
  };
  if (!existing) {
    return prisma.shopSetting.create({
      data: {
        settlementDays: input.settlementDays ?? 7,
        minWithdrawalAmount: input.minWithdrawalAmount ?? 100,
        withdrawalFeePercent: input.withdrawalFeePercent ?? 0,
        withdrawalFeeFixed: input.withdrawalFeeFixed ?? 0
      }
    });
  }
  return prisma.shopSetting.update({ where: { id: existing.id }, data });
}

export async function listWithdrawalMethods() {
  return prisma.withdrawalMethod.findMany({ orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
}

export async function createWithdrawalMethod(input: z.infer<typeof createWithdrawalMethodSchema>) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.withdrawalMethod.count();
    if (input.isDefault || count === 0) {
      await tx.withdrawalMethod.updateMany({ data: { isDefault: false } });
    }
    return tx.withdrawalMethod.create({
      data: {
        ...input,
        isDefault: input.isDefault || count === 0
      }
    });
  });
}

export async function listWalletTransactions() {
  return prisma.walletTransaction.findMany({ orderBy: { createdAt: "desc" } });
}

export async function settleDueOrders(now = new Date()) {
  const dueOrders = await prisma.order.findMany({
    where: {
      settlementStatus: "SETTLING",
      settlementDate: { lte: now }
    },
    orderBy: { settlementDate: "asc" }
  });
  const settled = [];
  for (const order of dueOrders) {
    const result = await prisma.$transaction(async (tx) => {
      const freshOrder = await tx.order.findUnique({ where: { id: order.id } });
      if (!freshOrder || freshOrder.settlementStatus !== "SETTLING") return null;
      const wallet = await tx.merchantWallet.findFirst() ?? await tx.merchantWallet.create({ data: {} });
      const balanceBefore = wallet.balance;
      const amount = Math.max(
        freshOrder.rentalFee + freshOrder.expressFee + freshOrder.tryOnFee + (freshOrder.cleaningFee ?? 0),
        0
      );
      const balanceAfter = balanceBefore + amount;
      await tx.merchantWallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          totalIncome: wallet.totalIncome + amount
        }
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "ORDER_INCOME",
          amount,
          balanceBefore,
          balanceAfter,
          orderId: freshOrder.id,
          note: "订单结算入账"
        }
      });
      return tx.order.update({
        where: { id: freshOrder.id },
        data: {
          status: "SETTLED",
          settlementStatus: "SETTLED"
        }
      });
    });
    if (result) settled.push(result);
  }
  return settled;
}

export async function listMemberLevels() {
  return prisma.memberLevel.findMany({
    orderBy: [{ sortOrder: "asc" }, { minSpend: "asc" }]
  });
}

export async function createMemberLevel(input: z.infer<typeof createMemberLevelSchema>) {
  return prisma.memberLevel.create({
    data: {
      name: input.name,
      minSpend: input.minSpend,
      discountPercent: input.discountPercent,
      benefits: JSON.stringify(input.benefits),
      enabled: input.enabled,
      sortOrder: input.sortOrder
    }
  });
}

export async function updateMemberLevelStatus(id: string, enabled: boolean) {
  return prisma.memberLevel.update({
    where: { id },
    data: { enabled }
  });
}

function parseFeeRules(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatTryOnSetting<T extends { feeRules: string }>(setting: T) {
  return { ...setting, feeRules: parseFeeRules(setting.feeRules) };
}

export async function getTryOnSetting() {
  const setting = await prisma.tryOnSetting.findFirst({ orderBy: { updatedAt: "desc" } });
  if (setting) return formatTryOnSetting(setting);
  const created = await prisma.tryOnSetting.create({ data: {} });
  return formatTryOnSetting(created);
}

export async function updateTryOnSetting(input: z.infer<typeof updateTryOnSettingSchema>) {
  const existing = await prisma.tryOnSetting.findFirst({ orderBy: { updatedAt: "desc" } });
  const data = {
    enabled: input.enabled,
    feeRules: JSON.stringify(input.feeRules),
    processNote: input.processNote,
    careNotice: input.careNotice
  };
  const setting = existing
    ? await prisma.tryOnSetting.update({ where: { id: existing.id }, data })
    : await prisma.tryOnSetting.create({ data });
  return formatTryOnSetting(setting);
}

export async function listReturnAddresses(onlyEnabled = false) {
  return prisma.returnAddress.findMany({
    where: onlyEnabled ? { enabled: true } : undefined,
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
  });
}

export async function createReturnAddress(input: z.infer<typeof createReturnAddressSchema>) {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.returnAddress.updateMany({ data: { isDefault: false } });
    }
    const count = await tx.returnAddress.count();
    return tx.returnAddress.create({
      data: {
        ...input,
        isDefault: input.isDefault || count === 0
      }
    });
  });
}

export async function updateReturnAddressStatus(id: string, enabled: boolean) {
  return prisma.returnAddress.update({
    where: { id },
    data: { enabled }
  });
}

export async function setDefaultReturnAddress(id: string) {
  return prisma.$transaction(async (tx) => {
    const address = await tx.returnAddress.findUnique({ where: { id } });
    if (!address) {
      throw new AppError("寄回地址不存在", 404, "RETURN_ADDRESS_NOT_FOUND");
    }
    await tx.returnAddress.updateMany({ data: { isDefault: false } });
    return tx.returnAddress.update({
      where: { id },
      data: { isDefault: true, enabled: true }
    });
  });
}

// ---------- Store Decoration Schemas ----------

export const createStoreTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  theme: z.string().default("default"),
  config: z.record(z.unknown()).default({}),
  isPreset: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

export const updateStoreTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  theme: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional()
});

export const createStoreDecorationSchema = z.object({
  templateId: z.string().uuid().optional(),
  name: z.string().min(1),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  components: z.array(z.record(z.unknown())).default([])
});

export const updateStoreDecorationSchema = z.object({
  templateId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  components: z.array(z.record(z.unknown())).optional()
});

// ---------- Store Template Service ----------

export async function listStoreTemplates() {
  return prisma.storeTemplate.findMany({
    orderBy: [{ isPreset: "desc" }, { createdAt: "desc" }]
  });
}

export async function getStoreTemplate(id: string) {
  const template = await prisma.storeTemplate.findUnique({ where: { id } });
  if (!template) {
    throw new AppError("模板不存在", 404, "STORE_TEMPLATE_NOT_FOUND");
  }
  return template;
}

export async function createStoreTemplate(input: z.infer<typeof createStoreTemplateSchema>) {
  return prisma.storeTemplate.create({
    data: {
      name: input.name,
      description: input.description,
      theme: input.theme,
      config: JSON.stringify(input.config),
      isPreset: input.isPreset,
      isActive: input.isActive
    }
  });
}

export async function updateStoreTemplate(id: string, input: z.infer<typeof updateStoreTemplateSchema>) {
  const existing = await prisma.storeTemplate.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("模板不存在", 404, "STORE_TEMPLATE_NOT_FOUND");
  }
  return prisma.storeTemplate.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      theme: input.theme,
      config: input.config !== undefined ? JSON.stringify(input.config) : undefined,
      isActive: input.isActive
    }
  });
}

export async function deleteStoreTemplate(id: string) {
  const existing = await prisma.storeTemplate.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("模板不存在", 404, "STORE_TEMPLATE_NOT_FOUND");
  }
  return prisma.storeTemplate.delete({ where: { id } });
}

// ---------- Store Decoration Service ----------

export async function listStoreDecorations() {
  return prisma.storeDecoration.findMany({
    orderBy: { createdAt: "desc" }
  });
}

export async function getActiveStoreDecoration() {
  const now = new Date();
  const decoration = await prisma.storeDecoration.findFirst({
    where: {
      isActive: true,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: { gte: now } }
      ]
    },
    orderBy: { updatedAt: "desc" }
  });
  return decoration;
}

export async function createStoreDecoration(input: z.infer<typeof createStoreDecorationSchema>) {
  return prisma.storeDecoration.create({
    data: {
      templateId: input.templateId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      components: JSON.stringify(input.components),
      isActive: false
    }
  });
}

export async function updateStoreDecoration(id: string, input: z.infer<typeof updateStoreDecorationSchema>) {
  const existing = await prisma.storeDecoration.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("装修记录不存在", 404, "STORE_DECORATION_NOT_FOUND");
  }
  return prisma.storeDecoration.update({
    where: { id },
    data: {
      templateId: input.templateId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      components: input.components !== undefined ? JSON.stringify(input.components) : undefined
    }
  });
}

export async function activateStoreDecoration(id: string) {
  const existing = await prisma.storeDecoration.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("装修记录不存在", 404, "STORE_DECORATION_NOT_FOUND");
  }
  return prisma.storeDecoration.update({
    where: { id },
    data: { isActive: true }
  });
}

export async function deactivateStoreDecoration(id: string) {
  const existing = await prisma.storeDecoration.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("装修记录不存在", 404, "STORE_DECORATION_NOT_FOUND");
  }
  return prisma.storeDecoration.update({
    where: { id },
    data: { isActive: false }
  });
}

// ---------- Store Component Service ----------

export async function listStoreComponents() {
  return prisma.storeComponent.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: "asc" }
  });
}

export async function ensureDefaultStoreComponents() {
  const defaults = [
    { type: "banner", name: "轮播图", icon: "image", defaultConfig: { images: [], height: 200, autoplay: true }, sortOrder: 1 },
    { type: "productGrid", name: "商品网格", icon: "grid", defaultConfig: { title: "精选商品", limit: 6, category: null }, sortOrder: 2 },
    { type: "coupon", name: "优惠券", icon: "ticket", defaultConfig: { title: "领券中心", couponIds: [] }, sortOrder: 3 },
    { type: "countdown", name: "倒计时", icon: "clock", defaultConfig: { title: "活动倒计时", targetDate: null, style: "default" }, sortOrder: 4 },
    { type: "notice", name: "公告栏", icon: "bell", defaultConfig: { content: "", style: "default", icon: true }, sortOrder: 5 },
    { type: "categoryNav", name: "分类导航", icon: "menu", defaultConfig: { categories: [], columns: 4 }, sortOrder: 6 },
    { type: "marquee", name: "跑马灯", icon: "scroll-text", defaultConfig: { text: "", speed: 40, style: "default" }, sortOrder: 7 },
    { type: "imageText", name: "图文板块", icon: "image-plus", defaultConfig: { title: "", content: "", image: null, layout: "left" }, sortOrder: 8 }
  ];

  for (const item of defaults) {
    await prisma.storeComponent.upsert({
      where: { type: item.type },
      update: {},
      create: {
        type: item.type,
        name: item.name,
        icon: item.icon,
        defaultConfig: JSON.stringify(item.defaultConfig),
        sortOrder: item.sortOrder,
        enabled: true
      }
    });
  }
}
