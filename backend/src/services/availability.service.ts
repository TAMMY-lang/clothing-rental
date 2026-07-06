import { z } from "zod";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { assertRentRange, getDateRange, toDateOnly } from "../utils/date.js";

type DbClient = PrismaClient | Prisma.TransactionClient;

export const availabilitySchema = z.object({
  productId: z.string().uuid(),
  specId: z.string().uuid(),
  rentStartDate: z.string(),
  rentEndDate: z.string()
});

export async function assertSpecAvailable(
  input: z.infer<typeof availabilitySchema>,
  client: DbClient = prisma
) {
  const start = toDateOnly(input.rentStartDate);
  const end = toDateOnly(input.rentEndDate);
  assertRentRange(start, end);

  const spec = await client.productSpec.findFirst({
    where: {
      id: input.specId,
      productId: input.productId,
      product: { status: "ACTIVE" }
    }
  });

  if (!spec) {
    throw new AppError("商品规格不存在或商品已下架", 404, "SPEC_NOT_FOUND");
  }

  const dates = getDateRange(start, end);
  const bookings = await client.inventoryBooking.groupBy({
    by: ["bookedDate"],
    where: {
      specId: input.specId,
      bookedDate: { in: dates }
    },
    _count: { id: true }
  });

  const unavailableDates = bookings
    .filter((item) => item._count.id >= spec.stock)
    .map((item) => item.bookedDate.toISOString().slice(0, 10));

  if (unavailableDates.length > 0) {
    throw new AppError(`所选档期已被占用：${unavailableDates.join(", ")}`, 409, "SCHEDULE_CONFLICT");
  }

  return { spec, dates, rentalDays: dates.length };
}

export async function checkAvailability(input: z.infer<typeof availabilitySchema>) {
  const result = await assertSpecAvailable(input);
  return {
    available: true,
    productId: input.productId,
    specId: input.specId,
    rentalDays: result.rentalDays
  };
}
