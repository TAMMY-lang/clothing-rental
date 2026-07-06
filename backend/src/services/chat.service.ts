import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

export const startConversationSchema = z.object({
  productId: z.string().uuid().optional(),
  initialMessage: z.string().min(1).max(1000).optional()
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000)
});

function conversationInclude() {
  return {
    customer: { select: { id: true, name: true, phone: true, role: true } },
    merchant: { select: { id: true, name: true, phone: true, role: true } },
    product: { select: { id: true, name: true, category: true, images: true } },
    messages: {
      include: { sender: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "asc" as const }
    }
  };
}

function formatConversation<T extends { product?: { images: string } | null }>(conversation: T) {
  return {
    ...conversation,
    product: conversation.product
      ? {
          ...conversation.product,
          images: JSON.parse(conversation.product.images || "[]")
        }
      : null
  };
}

async function getDefaultMerchant() {
  const merchant = await prisma.user.findFirst({
    where: { role: { in: ["MERCHANT", "ADMIN"] } },
    orderBy: { createdAt: "asc" }
  });
  if (!merchant) {
    throw new AppError("暂无可联系商家", 404, "MERCHANT_NOT_FOUND");
  }
  return merchant;
}

export async function listConversations(user: { id: string; role: string }) {
  const conversations = await prisma.chatConversation.findMany({
    where: user.role === "MERCHANT" || user.role === "ADMIN"
      ? { merchantId: user.id }
      : { customerId: user.id },
    include: conversationInclude(),
    orderBy: { updatedAt: "desc" }
  });
  return conversations.map(formatConversation);
}

export async function startConversation(userId: string, input: z.infer<typeof startConversationSchema>) {
  const merchant = await getDefaultMerchant();
  let conversation = await prisma.chatConversation.findFirst({
    where: {
      customerId: userId,
      merchantId: merchant.id,
      productId: input.productId ?? null
    },
    include: conversationInclude()
  });

  if (!conversation) {
    conversation = await prisma.chatConversation.create({
      data: {
        customerId: userId,
        merchantId: merchant.id,
        productId: input.productId
      },
      include: conversationInclude()
    });
  }

  if (input.initialMessage?.trim()) {
    conversation = await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: {
        messages: {
          create: {
            senderId: userId,
            content: input.initialMessage.trim()
          }
        }
      },
      include: conversationInclude()
    });
  }

  return formatConversation(conversation);
}

export async function sendMessage(user: { id: string; role: string }, conversationId: string, content: string) {
  const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
  if (!conversation) {
    throw new AppError("会话不存在", 404, "CONVERSATION_NOT_FOUND");
  }
  const isParticipant = conversation.customerId === user.id || conversation.merchantId === user.id || user.role === "ADMIN";
  if (!isParticipant) {
    throw new AppError("无权访问该会话", 403, "CHAT_FORBIDDEN");
  }
  await prisma.chatMessage.create({
    data: {
      conversationId,
      senderId: user.id,
      content: content.trim()
    }
  });
  const updated = await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
    include: conversationInclude()
  });
  return formatConversation(updated);
}
