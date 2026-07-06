-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "specId" TEXT NOT NULL,
    "rentStartDate" DATETIME NOT NULL,
    "rentEndDate" DATETIME NOT NULL,
    "rentalDays" INTEGER NOT NULL,
    "rentalFee" REAL NOT NULL,
    "deposit" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "originalTotalAmount" REAL,
    "priceAdjustmentReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "extensionType" TEXT,
    "extensionProof" TEXT,
    "extensionDays" INTEGER,
    "extensionFee" REAL,
    "shipmentDelayedUntil" DATETIME,
    "shipmentDelayReason" TEXT,
    "returnRequestedAt" DATETIME,
    "inspectedAt" DATETIME,
    "cleaningFee" REAL,
    "depositRefund" REAL,
    "shippingMethod" TEXT NOT NULL DEFAULT 'PICKUP',
    "shippingAddress" TEXT,
    "pickupLocation" TEXT,
    "expressFee" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_specId_fkey" FOREIGN KEY ("specId") REFERENCES "ProductSpec" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("cleaningFee", "createdAt", "deposit", "depositRefund", "extensionDays", "extensionFee", "extensionProof", "extensionType", "id", "inspectedAt", "originalTotalAmount", "priceAdjustmentReason", "productId", "rentEndDate", "rentStartDate", "rentalDays", "rentalFee", "returnRequestedAt", "shipmentDelayReason", "shipmentDelayedUntil", "specId", "status", "totalAmount", "updatedAt", "userId") SELECT "cleaningFee", "createdAt", "deposit", "depositRefund", "extensionDays", "extensionFee", "extensionProof", "extensionType", "id", "inspectedAt", "originalTotalAmount", "priceAdjustmentReason", "productId", "rentEndDate", "rentStartDate", "rentalDays", "rentalFee", "returnRequestedAt", "shipmentDelayReason", "shipmentDelayedUntil", "specId", "status", "totalAmount", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");
CREATE INDEX "Order_productId_specId_idx" ON "Order"("productId", "specId");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "style" TEXT,
    "scenario" TEXT,
    "tagPrice" REAL NOT NULL,
    "dailyRentalPrice" REAL NOT NULL,
    "depositAmount" REAL NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "mainImage" TEXT,
    "detailImages" TEXT NOT NULL DEFAULT '[]',
    "images" TEXT NOT NULL DEFAULT '[]',
    "conditionLevel" TEXT NOT NULL DEFAULT '九成新及以上',
    "shippingMethods" TEXT NOT NULL DEFAULT '["PICKUP","EXPRESS"]',
    "cleaningStandard" TEXT NOT NULL DEFAULT '一单一清洗，入库前消毒熨烫',
    "sizeAdvice" TEXT NOT NULL DEFAULT '建议结合身高、体重、胸围、腰围选择，可咨询商家',
    "shippingNote" TEXT NOT NULL DEFAULT '租赁周期不含路上运输时间，发货与归还物流时间需提前预留',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("category", "cleaningStandard", "conditionLevel", "createdAt", "dailyRentalPrice", "depositAmount", "id", "images", "name", "scenario", "shippingNote", "sizeAdvice", "status", "style", "tagPrice", "tags", "updatedAt") SELECT "category", "cleaningStandard", "conditionLevel", "createdAt", "dailyRentalPrice", "depositAmount", "id", "images", "name", "scenario", "shippingNote", "sizeAdvice", "status", "style", "tagPrice", "tags", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
