-- CreateTable
CREATE TABLE "TryOnSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "feeRules" TEXT NOT NULL DEFAULT '[]',
    "processNote" TEXT NOT NULL DEFAULT '确认租赁：试穿结束后寄回衣服，商家收到并验收后退押金和试穿费用。不租赁：需当天寄回，商家收到后退租金和押金，试穿费用不退。',
    "careNotice" TEXT NOT NULL DEFAULT '试穿期间请避免衣服弄脏、破损、香水残留和明显褶皱；如产生清洁或修复费用，将从押金中扣除。',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReturnAddress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

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
    "orderType" TEXT NOT NULL DEFAULT 'RENTAL',
    "tryOnFee" REAL NOT NULL DEFAULT 0,
    "tryOnQuantity" INTEGER NOT NULL DEFAULT 0,
    "tryOnDecision" TEXT,
    "returnAddressId" TEXT,
    "interceptStatus" TEXT,
    "interceptReason" TEXT,
    "interceptRefund" REAL,
    "interceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_specId_fkey" FOREIGN KEY ("specId") REFERENCES "ProductSpec" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("cleaningFee", "createdAt", "deposit", "depositRefund", "expressFee", "extensionDays", "extensionFee", "extensionProof", "extensionType", "id", "inspectedAt", "originalTotalAmount", "pickupLocation", "priceAdjustmentReason", "productId", "rentEndDate", "rentStartDate", "rentalDays", "rentalFee", "returnRequestedAt", "shipmentDelayReason", "shipmentDelayedUntil", "shippingAddress", "shippingMethod", "specId", "status", "totalAmount", "updatedAt", "userId") SELECT "cleaningFee", "createdAt", "deposit", "depositRefund", "expressFee", "extensionDays", "extensionFee", "extensionProof", "extensionType", "id", "inspectedAt", "originalTotalAmount", "pickupLocation", "priceAdjustmentReason", "productId", "rentEndDate", "rentStartDate", "rentalDays", "rentalFee", "returnRequestedAt", "shipmentDelayReason", "shipmentDelayedUntil", "shippingAddress", "shippingMethod", "specId", "status", "totalAmount", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");
CREATE INDEX "Order_productId_specId_idx" ON "Order"("productId", "specId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
