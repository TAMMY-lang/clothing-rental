-- AlterTable
ALTER TABLE "Order" ADD COLUMN "originalTotalAmount" REAL;
ALTER TABLE "Order" ADD COLUMN "priceAdjustmentReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "shipmentDelayReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "shipmentDelayedUntil" DATETIME;

-- CreateTable
CREATE TABLE "ShopAnnouncement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
