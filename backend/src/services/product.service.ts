import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

export const createProductSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  style: z.string().optional(),
  scenario: z.string().optional(),
  tagPrice: z.coerce.number().positive(),
  dailyRentalPrice: z.coerce.number().positive(),
  depositAmount: z.coerce.number().min(40).max(300),
  tags: z.array(z.string()).default([]),
  mainImage: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  explanation: z.string().max(2000).optional(),
  detailImages: z.array(z.string().url()).default([]),
  images: z.array(z.string().url()).default([]),
  conditionLevel: z.string().optional(),
  cleaningStandard: z.string().optional(),
  sizeAdvice: z.string().optional(),
  shippingNote: z.string().optional(),
  shippingMethods: z.array(z.enum(["PICKUP", "EXPRESS"])).default(["PICKUP", "EXPRESS"]),
  specs: z.array(
    z.object({
      skuCode: z.string().optional(),
      color: z.string().optional(),
      size: z.string().optional(),
      bust: z.coerce.number().positive().optional(),
      waist: z.coerce.number().positive().optional(),
      stock: z.coerce.number().int().positive().default(1)
    })
  ).min(1, "至少需要一个规格")
});

export const listProductsSchema = z.object({
  keyword: z.string().optional(),
  category: z.string().optional(),
  scenario: z.string().optional(),
  style: z.string().optional(),
  size: z.string().optional(),
  includeInactive: z.string().optional()
});

export const updateProductStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"])
});

export const updateSpecStockSchema = z.object({
  stock: z.coerce.number().int().min(0)
});

export const updateProductSpecSchema = z.object({
  skuCode: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  bust: z.coerce.number().positive().optional(),
  waist: z.coerce.number().positive().optional(),
  stock: z.coerce.number().int().min(0)
});

export const createCategorySchema = z.object({
  name: z.string().min(1),
  sortOrder: z.coerce.number().int().min(0).default(0)
});

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type ProductWithSerializedFields = {
  tags: string;
  images: string;
  detailImages: string;
  shippingMethods: string;
  id?: string;
  orders?: unknown[];
  _count?: {
    favorites?: number;
    cartItems?: number;
  };
};

function formatProduct<T extends ProductWithSerializedFields>(product: T) {
  const { orders, _count, ...rest } = product;
  return {
    ...rest,
    tags: parseStringArray(product.tags),
    images: parseStringArray(product.images),
    detailImages: parseStringArray(product.detailImages),
    shippingMethods: parseStringArray(product.shippingMethods),
    salesCount: Array.isArray(orders) ? orders.length : 0,
    favoriteCount: _count?.favorites ?? 0,
    cartCount: _count?.cartItems ?? 0
  };
}

export async function createProduct(input: z.infer<typeof createProductSchema>) {
  if (input.depositAmount < 40 || input.depositAmount > 300) {
    throw new AppError("固定押金必须在 40 到 300 元之间", 400, "INVALID_DEPOSIT");
  }

  return prisma.product.create({
    data: {
      name: input.name,
      category: input.category,
      style: input.style,
      scenario: input.scenario,
      tagPrice: input.tagPrice,
      dailyRentalPrice: input.dailyRentalPrice,
      depositAmount: input.depositAmount,
      tags: JSON.stringify(input.tags),
      mainImage: input.mainImage,
      videoUrl: input.videoUrl,
      explanation: input.explanation,
      detailImages: JSON.stringify(input.detailImages),
      images: JSON.stringify(input.mainImage ? [input.mainImage, ...input.detailImages] : input.images),
      conditionLevel: input.conditionLevel,
      cleaningStandard: input.cleaningStandard,
      sizeAdvice: input.sizeAdvice,
      shippingNote: input.shippingNote,
      shippingMethods: JSON.stringify(input.shippingMethods),
      specs: {
        create: input.specs.map((spec) => ({
          skuCode: spec.skuCode,
          color: spec.color,
          size: spec.size,
          bust: spec.bust,
          waist: spec.waist,
          stock: spec.stock
        }))
      }
    },
    include: { specs: true }
  }).then(formatProduct);
}

export async function listProducts(query: z.infer<typeof listProductsSchema>) {
  const includeInactive = query.includeInactive === "true";
  const products = await prisma.product.findMany({
    where: {
      status: includeInactive ? { not: "DELETED" } : "ACTIVE",
      name: query.keyword ? { contains: query.keyword } : undefined,
      category: query.category,
      scenario: query.scenario,
      style: query.style,
      specs: query.size ? { some: { size: query.size } } : undefined
    },
    include: {
      specs: true,
      orders: { where: { status: { in: ["RENTING", "PENDING_RETURN", "COMPLETED"] } } },
      _count: { select: { favorites: true, cartItems: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  return products.map(formatProduct);
}

export async function listCategories() {
  const categories = await prisma.productCategory.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });
  const productCategories = await prisma.product.findMany({
    where: { status: { not: "DELETED" } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" }
  });

  const productCategoryItems = productCategories.map((item, index) => ({
    id: item.category,
    name: item.category,
    sortOrder: index,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  const merged = [...categories, ...productCategoryItems];
  return Array.from(
    new Map(merged.map((category) => [category.name, category])).values()
  ).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "zh-CN"));
}

export async function createCategory(input: z.infer<typeof createCategorySchema>) {
  return prisma.productCategory.upsert({
    where: { name: input.name },
    update: {
      enabled: true,
      sortOrder: input.sortOrder
    },
    create: {
      name: input.name,
      sortOrder: input.sortOrder
    }
  });
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      specs: true,
      orders: { where: { status: { in: ["RENTING", "PENDING_RETURN", "COMPLETED"] } } },
      _count: { select: { favorites: true, cartItems: true } }
    }
  });
  if (!product || product.status === "DELETED") {
    throw new AppError("商品不存在", 404, "PRODUCT_NOT_FOUND");
  }
  return formatProduct(product);
}

export async function getProductOverview() {
  const [products, totalOrders, completedOrders, rentingOrders, pendingReturnOrders, pendingInspectionOrders, turnoverAggregate] = await Promise.all([
    prisma.product.findMany({
      where: { status: { not: "DELETED" } },
      include: {
        specs: true,
        orders: { where: { status: { in: ["RENTING", "PENDING_RETURN", "COMPLETED"] } } },
        _count: { select: { favorites: true, cartItems: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ["COMPLETED", "SETTLING", "SETTLED"] } } }),
    prisma.order.count({ where: { status: { in: ["RENTING", "PENDING_RETURN", "PENDING_EXTENSION"] } } }),
    prisma.order.count({ where: { status: "PENDING_RETURN" } }),
    prisma.order.count({ where: { status: "PENDING_INSPECTION" } }),
    prisma.order.aggregate({
      where: { status: { notIn: ["CANCELED", "PENDING", "PENDING_PAYMENT"] } },
      _sum: { totalAmount: true }
    })
  ]);

  const formattedProducts = products.map(formatProduct);
  const totalStock = products.reduce(
    (sum, product) => sum + product.specs.reduce((stockSum, spec) => stockSum + spec.stock, 0),
    0
  );
  const activeProducts = products.filter((product) => product.status === "ACTIVE").length;
  const topProducts = [...formattedProducts]
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 5);
  const newArrivals = formattedProducts.slice(0, 5);
  const engagementProducts = [...formattedProducts]
    .sort((a, b) => (b.favoriteCount + b.cartCount) - (a.favoriteCount + a.cartCount))
    .slice(0, 8);
  const visitorCount = Math.max(
    products.reduce((sum, product) => sum + product._count.favorites + product._count.cartItems, 0) + totalOrders * 3,
    products.length * 8
  );

  return {
    summary: {
      totalProducts: products.length,
      activeProducts,
      totalStock,
      totalOrders,
      rentingOrders,
      completedOrders,
      pendingReturnOrders,
      pendingInspectionOrders,
      turnoverAmount: turnoverAggregate._sum.totalAmount ?? 0,
      visitorCount
    },
    topProducts,
    newArrivals,
    engagementProducts
  };
}

export async function updateProductStatus(id: string, status: string) {
  const product = await prisma.product.update({
    where: { id },
    data: { status },
    include: { specs: true }
  });
  return formatProduct(product);
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.update({
    where: { id },
    data: { status: "DELETED" },
    include: { specs: true }
  });
  await prisma.cartItem.deleteMany({ where: { productId: id } });
  await prisma.favorite.deleteMany({ where: { productId: id } });
  return formatProduct(product);
}

export async function activateAllProducts() {
  await prisma.product.updateMany({
    where: { status: { not: "DELETED" } },
    data: { status: "ACTIVE" }
  });
  return listProducts({});
}

export async function updateSpecStock(specId: string, stock: number) {
  return prisma.productSpec.update({
    where: { id: specId },
    data: { stock }
  });
}

export async function updateProductSpec(specId: string, input: z.infer<typeof updateProductSpecSchema>) {
  return prisma.productSpec.update({
    where: { id: specId },
    data: {
      skuCode: input.skuCode,
      color: input.color,
      size: input.size,
      bust: input.bust,
      waist: input.waist,
      stock: input.stock
    }
  });
}
