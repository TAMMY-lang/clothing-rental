-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'AMOUNT',
    "discountAmount" REAL,
    "discountPercent" REAL,
    "minOrderAmount" REAL NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "images" TEXT NOT NULL DEFAULT '[]',
    "conditionLevel" TEXT NOT NULL DEFAULT '九成新及以上',
    "cleaningStandard" TEXT NOT NULL DEFAULT '一单一清洗，入库前消毒熨烫',
    "sizeAdvice" TEXT NOT NULL DEFAULT '建议结合身高、体重、胸围、腰围选择，可咨询商家',
    "shippingNote" TEXT NOT NULL DEFAULT '租赁周期不含路上运输时间，发货与归还物流时间需提前预留',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("category", "createdAt", "dailyRentalPrice", "depositAmount", "id", "images", "name", "scenario", "status", "style", "tagPrice", "tags", "updatedAt") SELECT "category", "createdAt", "dailyRentalPrice", "depositAmount", "id", "images", "name", "scenario", "status", "style", "tagPrice", "tags", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
