import { AppError } from "./app-error.js";

export function toDateOnly(input: string | Date): Date {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new AppError("日期格式不正确", 400, "INVALID_DATE");
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function getInclusiveDays(start: Date, end: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / oneDay) + 1;
}

export function getDateRange(start: Date, end: Date): Date[] {
  const days = getInclusiveDays(start, end);
  if (days < 1) {
    throw new AppError("租赁结束日期不能早于开始日期", 400, "INVALID_RENT_RANGE");
  }
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date;
  });
}

export function assertRentRange(start: Date, end: Date): number {
  const days = getInclusiveDays(start, end);
  if (days < 1 || days > 7) {
    throw new AppError("租赁周期必须为 1 到 7 天", 400, "RENT_DAYS_OUT_OF_RANGE");
  }
  return days;
}

export function isWithinLast24HoursBeforeEnd(endDate: Date, now = new Date()): boolean {
  const endAt = new Date(endDate);
  endAt.setUTCHours(23, 59, 59, 999);
  const diff = endAt.getTime() - now.getTime();
  return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
}
