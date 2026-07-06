import { z } from "zod";
import { prisma } from "../config/prisma.js";

export const addCartItemSchema = z.object({
  productId: z.string().uuid(),
  specId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).default(1)
});

function formatProduct<T extends { tags: string; images: string }>(product: T) {
  return {
    ...product,
    tags: JSON.parse(product.tags || "[]"),
    images: JSON.parse(product.images || "[]")
  };
}

export async function listCart(userId: string) {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: { include: { orders: true } }, spec: true },
    orderBy: { createdAt: "desc" }
  });
  return items.map((item) => ({
    ...item,
    product: {
      ...formatProduct(item.product),
      salesCount: item.product.orders.filter((order) => ["RENTING", "PENDING_RETURN", "COMPLETED"].includes(order.status)).length
    }
  }));
}

export async function addCartItem(userId: string, input: z.infer<typeof addCartItemSchema>) {
  return prisma.cartItem.upsert({
    where: {
      userId_productId_specId: {
        userId,
        productId: input.productId,
        specId: input.specId
      }
    },
    update: { quantity: { increment: input.quantity } },
    create: {
      userId,
      productId: input.productId,
      specId: input.specId,
      quantity: input.quantity
    },
    include: { product: true, spec: true }
  });
}

export async function removeCartItem(userId: string, id: string) {
  return prisma.cartItem.deleteMany({
    where: { id, userId }
  });
}

export async function listFavorites(userId: string) {
  const items = await prisma.favorite.findMany({
    where: { userId },
    include: { product: { include: { specs: true, orders: true } } },
    orderBy: { createdAt: "desc" }
  });
  return items.map((item) => ({
    ...item,
    product: {
      ...formatProduct(item.product),
      salesCount: item.product.orders.filter((order) => ["RENTING", "PENDING_RETURN", "COMPLETED"].includes(order.status)).length
    }
  }));
}

export async function addFavorite(userId: string, productId: string) {
  return prisma.favorite.upsert({
    where: { userId_productId: { userId, productId } },
    update: {},
    create: { userId, productId },
    include: { product: true }
  });
}

export async function removeFavorite(userId: string, productId: string) {
  return prisma.favorite.delete({
    where: { userId_productId: { userId, productId } }
  });
}
