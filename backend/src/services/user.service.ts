import { z } from "zod";
import { prisma } from "../config/prisma.js";

export const createUserSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  customSize: z.record(z.unknown()).optional()
});

export async function createUser(input: z.infer<typeof createUserSchema>) {
  const customSize = input.customSize == null ? undefined : JSON.stringify(input.customSize);

  return prisma.user.upsert({
    where: { phone: input.phone },
    update: {
      name: input.name,
      customSize
    },
    create: {
      name: input.name,
      phone: input.phone,
      customSize
    }
  });
}

export async function getUser(id: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id },
    include: { orders: { orderBy: { createdAt: "desc" } } }
  });
}
