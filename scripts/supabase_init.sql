-- ============================================================
-- Supabase PostgreSQL Initialization Script (with DROP)
-- Run this to reset all tables
-- ============================================================

-- Drop all existing tables (reverse dependency order)
DROP TABLE IF EXISTS "StoreComponent" CASCADE;
DROP TABLE IF EXISTS "StoreDecoration" CASCADE;
DROP TABLE IF EXISTS "StoreTemplate" CASCADE;
DROP TABLE IF EXISTS "ExtensionReview" CASCADE;
DROP TABLE IF EXISTS "MerchantTenantReview" CASCADE;
DROP TABLE IF EXISTS "ProductReview" CASCADE;
DROP TABLE IF EXISTS "ChatMessage" CASCADE;
DROP TABLE IF EXISTS "ChatConversation" CASCADE;
DROP TABLE IF EXISTS "MemberLevel" CASCADE;
DROP TABLE IF EXISTS "WalletTransaction" CASCADE;
DROP TABLE IF EXISTS "WithdrawalMethod" CASCADE;
DROP TABLE IF EXISTS "ShopSetting" CASCADE;
DROP TABLE IF EXISTS "Withdrawal" CASCADE;
DROP TABLE IF EXISTS "MerchantWallet" CASCADE;
DROP TABLE IF EXISTS "Favorite" CASCADE;
DROP TABLE IF EXISTS "CartItem" CASCADE;
DROP TABLE IF EXISTS "Coupon" CASCADE;
DROP TABLE IF EXISTS "ShopAnnouncement" CASCADE;
DROP TABLE IF EXISTS "ReturnAddress" CASCADE;
DROP TABLE IF EXISTS "TryOnSetting" CASCADE;
DROP TABLE IF EXISTS "InventoryBooking" CASCADE;
DROP TABLE IF EXISTS "Payment" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;
DROP TABLE IF EXISTS "ProductSpec" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "ProductCategory" CASCADE;
DROP TABLE IF EXISTS "Device" CASCADE;
DROP TABLE IF EXISTS "UserSession" CASCADE;
DROP TABLE IF EXISTS "LoginLog" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "SecuritySetting" CASCADE;

-- ============================================================
-- Supabase PostgreSQL Initialization Script
-- Generated from Prisma schema
-- ============================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Shared trigger function for updatedAt
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. SecuritySetting (no foreign keys)
-- ============================================================
CREATE TABLE "SecuritySetting" (
  "id"                 TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "totpRequired"       BOOLEAN     NOT NULL DEFAULT true,
  "smsFallbackEnabled" BOOLEAN     NOT NULL DEFAULT true,
  "singleDeviceLogin"  BOOLEAN     NOT NULL DEFAULT true,
  "passwordMinLength"  INTEGER     NOT NULL DEFAULT 8,
  "passwordMaxLength"  INTEGER     NOT NULL DEFAULT 20,
  "passwordHistoryLimit" INTEGER   NOT NULL DEFAULT 3,
  "loginFailCaptchaAt" INTEGER     NOT NULL DEFAULT 3,
  "loginFailLockAt"    INTEGER     NOT NULL DEFAULT 5,
  "paymentFailLockAt"  INTEGER     NOT NULL DEFAULT 3,
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER "SecuritySetting_updatedAt"
  BEFORE UPDATE ON "SecuritySetting"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 2. User (no foreign keys)
-- ============================================================
CREATE TABLE "User" (
  "id"                TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"              TEXT        NOT NULL,
  "phone"             TEXT        NOT NULL,
  "passwordHash"      TEXT,
  "passwordHistory"   TEXT        NOT NULL DEFAULT '[]',
  "loginFailCount"    INTEGER     NOT NULL DEFAULT 0,
  "loginLockUntil"    TIMESTAMPTZ,
  "paymentPasswordHash" TEXT,
  "paymentFailCount"  INTEGER     NOT NULL DEFAULT 0,
  "paymentLockUntil"  TIMESTAMPTZ,
  "lastLoginAt"       TIMESTAMPTZ,
  "lastLoginIp"       TEXT,
  "totpSecret"        TEXT,
  "totpEnabled"       BOOLEAN     NOT NULL DEFAULT false,
  "activeSessionId"   TEXT,
  "sessionExpiresAt"  TIMESTAMPTZ,
  "disabled"          BOOLEAN     NOT NULL DEFAULT false,
  "disabledAt"        TIMESTAMPTZ,
  "role"              TEXT        NOT NULL DEFAULT 'USER',
  "customSize"        TEXT,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("phone")
);

CREATE TRIGGER "User_updatedAt"
  BEFORE UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 3. LoginLog -> User (onDelete: SetNull)
-- ============================================================
CREATE TABLE "LoginLog" (
  "id"        TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    TEXT,
  "phone"     TEXT        NOT NULL,
  "ip"        TEXT,
  "device"    TEXT,
  "success"   BOOLEAN     NOT NULL DEFAULT false,
  "reason"    TEXT,
  "role"      TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "LoginLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX "LoginLog_userId_createdAt_idx" ON "LoginLog" ("userId", "createdAt");
CREATE INDEX "LoginLog_phone_createdAt_idx" ON "LoginLog" ("phone", "createdAt");

-- ============================================================
-- 4. UserSession -> User (onDelete: Cascade)
-- ============================================================
CREATE TABLE "UserSession" (
  "id"           TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"       TEXT        NOT NULL,
  "deviceName"   TEXT        NOT NULL,
  "deviceId"     TEXT        NOT NULL,
  "ip"           TEXT        NOT NULL,
  "userAgent"    TEXT,
  "loginAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "lastActiveAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt"    TIMESTAMPTZ NOT NULL,
  "isActive"     BOOLEAN     NOT NULL DEFAULT true,
  "logoutAt"     TIMESTAMPTZ,
  CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "UserSession_userId_isActive_idx" ON "UserSession" ("userId", "isActive");
CREATE INDEX "UserSession_deviceId_idx" ON "UserSession" ("deviceId");

-- ============================================================
-- 5. Device -> User (onDelete: Cascade)
-- ============================================================
CREATE TABLE "Device" (
  "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"      TEXT        NOT NULL,
  "deviceId"    TEXT        NOT NULL,
  "deviceName"  TEXT,
  "ip"          TEXT,
  "trusted"     BOOLEAN     NOT NULL DEFAULT false,
  "smsVerified" BOOLEAN     NOT NULL DEFAULT false,
  "lastLoginAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  UNIQUE ("userId", "deviceId")
);

CREATE INDEX "Device_userId_idx" ON "Device" ("userId");

-- ============================================================
-- 6. ProductCategory (no foreign keys)
-- ============================================================
CREATE TABLE "ProductCategory" (
  "id"        TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"      TEXT        NOT NULL,
  "sortOrder" INTEGER     NOT NULL DEFAULT 0,
  "enabled"   BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("name")
);

CREATE TRIGGER "ProductCategory_updatedAt"
  BEFORE UPDATE ON "ProductCategory"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 7. Product (no foreign keys)
-- ============================================================
CREATE TABLE "Product" (
  "id"               TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"             TEXT        NOT NULL,
  "category"         TEXT        NOT NULL,
  "style"            TEXT,
  "scenario"         TEXT,
  "tagPrice"         DOUBLE PRECISION NOT NULL,
  "dailyRentalPrice" DOUBLE PRECISION NOT NULL,
  "depositAmount"    DOUBLE PRECISION NOT NULL,
  "tags"             TEXT        NOT NULL DEFAULT '[]',
  "mainImage"        TEXT,
  "videoUrl"         TEXT,
  "explanation"      TEXT,
  "detailImages"     TEXT        NOT NULL DEFAULT '[]',
  "images"           TEXT        NOT NULL DEFAULT '[]',
  "conditionLevel"   TEXT        NOT NULL DEFAULT '九成新及以上',
  "shippingMethods"  TEXT        NOT NULL DEFAULT '["PICKUP","EXPRESS"]',
  "cleaningStandard" TEXT        NOT NULL DEFAULT '一单一清洗，入库前消毒熨烫',
  "sizeAdvice"       TEXT        NOT NULL DEFAULT '建议结合身高、体重、胸围、腰围选择，可咨询商家',
  "shippingNote"     TEXT        NOT NULL DEFAULT '租赁周期不含路上运输时间，发货与归还物流时间需提前预留',
  "status"           TEXT        NOT NULL DEFAULT 'ACTIVE',
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER "Product_updatedAt"
  BEFORE UPDATE ON "Product"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 8. ProductSpec -> Product (onDelete: Cascade)
-- ============================================================
CREATE TABLE "ProductSpec" (
  "id"        TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" TEXT        NOT NULL,
  "skuCode"   TEXT,
  "color"     TEXT,
  "size"      TEXT,
  "bust"      DOUBLE PRECISION,
  "waist"     DOUBLE PRECISION,
  "stock"     INTEGER     NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ProductSpec_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);

CREATE INDEX "ProductSpec_productId_idx" ON "ProductSpec" ("productId");

CREATE TRIGGER "ProductSpec_updatedAt"
  BEFORE UPDATE ON "ProductSpec"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 9. Order -> User, Product, ProductSpec (no explicit onDelete)
-- ============================================================
CREATE TABLE "Order" (
  "id"                    TEXT             PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"                TEXT             NOT NULL,
  "productId"             TEXT             NOT NULL,
  "specId"                TEXT             NOT NULL,
  "rentStartDate"         TIMESTAMPTZ      NOT NULL,
  "rentEndDate"           TIMESTAMPTZ      NOT NULL,
  "rentalDays"            INTEGER          NOT NULL,
  "rentalFee"             DOUBLE PRECISION  NOT NULL,
  "deposit"               DOUBLE PRECISION  NOT NULL,
  "totalAmount"           DOUBLE PRECISION  NOT NULL,
  "originalTotalAmount"   DOUBLE PRECISION,
  "priceAdjustmentReason" TEXT,
  "status"                TEXT             NOT NULL DEFAULT 'PENDING_PAYMENT',
  "extensionType"         TEXT,
  "extensionProof"        TEXT,
  "extensionDays"         INTEGER,
  "extensionFee"          DOUBLE PRECISION,
  "shipmentDelayedUntil"  TIMESTAMPTZ,
  "shipmentDelayReason"   TEXT,
  "returnRequestedAt"     TIMESTAMPTZ,
  "inspectedAt"           TIMESTAMPTZ,
  "cleaningFee"           DOUBLE PRECISION,
  "depositRefund"         DOUBLE PRECISION,
  "shippingMethod"        TEXT             NOT NULL DEFAULT 'PICKUP',
  "shippingAddress"       TEXT,
  "pickupLocation"        TEXT,
  "expressFee"            DOUBLE PRECISION  NOT NULL DEFAULT 0,
  "logisticsCompany"      TEXT,
  "logisticsTrackingNumber" TEXT,
  "logisticsStatus"       TEXT,
  "logisticsHistory"      TEXT             NOT NULL DEFAULT '[]',
  "shippedAt"             TIMESTAMPTZ,
  "orderType"             TEXT             NOT NULL DEFAULT 'RENTAL',
  "tryOnFee"              DOUBLE PRECISION  NOT NULL DEFAULT 0,
  "tryOnQuantity"         INTEGER          NOT NULL DEFAULT 0,
  "tryOnDecision"         TEXT,
  "returnAddressId"       TEXT,
  "interceptStatus"       TEXT,
  "interceptReason"       TEXT,
  "interceptRefund"       DOUBLE PRECISION,
  "interceptedAt"         TIMESTAMPTZ,
  "settlementDate"        TIMESTAMPTZ,
  "settlementStatus"      TEXT,
  "createdAt"             TIMESTAMPTZ      NOT NULL DEFAULT now(),
  "updatedAt"             TIMESTAMPTZ      NOT NULL DEFAULT now(),
  CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id"),
  CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id"),
  CONSTRAINT "Order_specId_fkey" FOREIGN KEY ("specId") REFERENCES "ProductSpec"("id")
);

CREATE INDEX "Order_userId_status_idx" ON "Order" ("userId", "status");
CREATE INDEX "Order_productId_specId_idx" ON "Order" ("productId", "specId");

CREATE TRIGGER "Order_updatedAt"
  BEFORE UPDATE ON "Order"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 10. Payment -> Order (onDelete: Cascade), User (onDelete: Cascade)
-- ============================================================
CREATE TABLE "Payment" (
  "id"            TEXT             PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId"       TEXT             NOT NULL,
  "userId"        TEXT             NOT NULL,
  "amount"        DOUBLE PRECISION  NOT NULL,
  "type"          TEXT             NOT NULL DEFAULT 'ORDER_PAY',
  "method"        TEXT             NOT NULL DEFAULT 'MOCK',
  "status"        TEXT             NOT NULL DEFAULT 'PENDING',
  "transactionId" TEXT,
  "refundAmount"  DOUBLE PRECISION,
  "rawPayload"    TEXT,
  "createdAt"     TIMESTAMPTZ      NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ      NOT NULL DEFAULT now(),
  CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE,
  CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "Payment_orderId_status_idx" ON "Payment" ("orderId", "status");
CREATE INDEX "Payment_userId_status_idx" ON "Payment" ("userId", "status");

CREATE TRIGGER "Payment_updatedAt"
  BEFORE UPDATE ON "Payment"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 11. InventoryBooking -> Product, ProductSpec, Order (all onDelete: Cascade)
-- ============================================================
CREATE TABLE "InventoryBooking" (
  "id"         TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId"  TEXT        NOT NULL,
  "specId"     TEXT        NOT NULL,
  "orderId"    TEXT        NOT NULL,
  "bookedDate" TIMESTAMPTZ NOT NULL,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "InventoryBooking_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
  CONSTRAINT "InventoryBooking_specId_fkey" FOREIGN KEY ("specId") REFERENCES "ProductSpec"("id") ON DELETE CASCADE,
  CONSTRAINT "InventoryBooking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE
);

CREATE INDEX "InventoryBooking_specId_bookedDate_idx" ON "InventoryBooking" ("specId", "bookedDate");
CREATE INDEX "InventoryBooking_productId_bookedDate_idx" ON "InventoryBooking" ("productId", "bookedDate");

-- ============================================================
-- 12. TryOnSetting (no foreign keys)
-- ============================================================
CREATE TABLE "TryOnSetting" (
  "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "enabled"     BOOLEAN     NOT NULL DEFAULT true,
  "feeRules"    TEXT        NOT NULL DEFAULT '[]',
  "processNote" TEXT        NOT NULL DEFAULT '确认租赁：试穿结束后寄回衣服，商家收到并验收后退押金和试穿费用。不租赁：需当天寄回，商家收到后退租金和押金，试穿费用不退。',
  "careNotice"  TEXT        NOT NULL DEFAULT '试穿期间请避免衣服弄脏、破损、香水残留和明显褶皱；如产生清洁或修复费用，将从押金中扣除。',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER "TryOnSetting_updatedAt"
  BEFORE UPDATE ON "TryOnSetting"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 13. ReturnAddress (no foreign keys)
-- ============================================================
CREATE TABLE "ReturnAddress" (
  "id"        TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "label"     TEXT        NOT NULL,
  "receiver"  TEXT        NOT NULL,
  "phone"     TEXT        NOT NULL,
  "address"   TEXT        NOT NULL,
  "isDefault" BOOLEAN     NOT NULL DEFAULT false,
  "enabled"   BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER "ReturnAddress_updatedAt"
  BEFORE UPDATE ON "ReturnAddress"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 14. ShopAnnouncement (no foreign keys)
-- ============================================================
CREATE TABLE "ShopAnnouncement" (
  "id"        TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "title"     TEXT        NOT NULL,
  "content"   TEXT        NOT NULL,
  "enabled"   BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER "ShopAnnouncement_updatedAt"
  BEFORE UPDATE ON "ShopAnnouncement"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 15. Coupon (no foreign keys)
-- ============================================================
CREATE TABLE "Coupon" (
  "id"              TEXT             PRIMARY KEY DEFAULT gen_random_uuid(),
  "title"           TEXT             NOT NULL,
  "code"            TEXT             NOT NULL,
  "type"            TEXT             NOT NULL DEFAULT 'AMOUNT',
  "discountAmount"  DOUBLE PRECISION,
  "discountPercent" DOUBLE PRECISION,
  "minOrderAmount"  DOUBLE PRECISION  NOT NULL DEFAULT 0,
  "enabled"         BOOLEAN          NOT NULL DEFAULT true,
  "usageLimit"      INTEGER,
  "createdAt"       TIMESTAMPTZ      NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ      NOT NULL DEFAULT now(),
  UNIQUE ("code")
);

CREATE TRIGGER "Coupon_updatedAt"
  BEFORE UPDATE ON "Coupon"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 16. CartItem -> User, Product, ProductSpec (all onDelete: Cascade)
-- ============================================================
CREATE TABLE "CartItem" (
  "id"        TEXT    PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    TEXT    NOT NULL,
  "productId" TEXT    NOT NULL,
  "specId"    TEXT    NOT NULL,
  "quantity"  INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
  CONSTRAINT "CartItem_specId_fkey" FOREIGN KEY ("specId") REFERENCES "ProductSpec"("id") ON DELETE CASCADE,
  UNIQUE ("userId", "productId", "specId")
);

CREATE INDEX "CartItem_userId_idx" ON "CartItem" ("userId");

CREATE TRIGGER "CartItem_updatedAt"
  BEFORE UPDATE ON "CartItem"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 17. Favorite -> User, Product (all onDelete: Cascade)
-- ============================================================
CREATE TABLE "Favorite" (
  "id"        TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    TEXT        NOT NULL,
  "productId" TEXT        NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Favorite_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
  UNIQUE ("userId", "productId")
);

CREATE INDEX "Favorite_userId_idx" ON "Favorite" ("userId");

-- ============================================================
-- 18. MerchantWallet (no foreign keys)
-- ============================================================
CREATE TABLE "MerchantWallet" (
  "id"          TEXT             PRIMARY KEY DEFAULT gen_random_uuid(),
  "balance"     DOUBLE PRECISION  NOT NULL DEFAULT 0,
  "frozen"      DOUBLE PRECISION  NOT NULL DEFAULT 0,
  "totalIncome" DOUBLE PRECISION  NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMPTZ      NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE TRIGGER "MerchantWallet_updatedAt"
  BEFORE UPDATE ON "MerchantWallet"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 19. Withdrawal (no foreign keys)
-- ============================================================
CREATE TABLE "Withdrawal" (
  "id"            TEXT             PRIMARY KEY DEFAULT gen_random_uuid(),
  "amount"        DOUBLE PRECISION  NOT NULL,
  "accountName"   TEXT             NOT NULL,
  "accountNo"     TEXT             NOT NULL,
  "channel"       TEXT             NOT NULL DEFAULT 'BANK',
  "channelAccount" TEXT            NOT NULL DEFAULT '',
  "channelName"   TEXT             NOT NULL DEFAULT '',
  "methodId"      TEXT,
  "status"        TEXT             NOT NULL DEFAULT 'PENDING',
  "createdAt"     TIMESTAMPTZ      NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE TRIGGER "Withdrawal_updatedAt"
  BEFORE UPDATE ON "Withdrawal"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 20. ShopSetting (no foreign keys)
-- ============================================================
CREATE TABLE "ShopSetting" (
  "id"                   TEXT             PRIMARY KEY DEFAULT gen_random_uuid(),
  "settlementDays"       INTEGER          NOT NULL DEFAULT 7,
  "minWithdrawalAmount"  DOUBLE PRECISION  NOT NULL DEFAULT 100,
  "withdrawalFeePercent" DOUBLE PRECISION  NOT NULL DEFAULT 0,
  "withdrawalFeeFixed"   DOUBLE PRECISION  NOT NULL DEFAULT 0,
  "createdAt"            TIMESTAMPTZ      NOT NULL DEFAULT now(),
  "updatedAt"            TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE TRIGGER "ShopSetting_updatedAt"
  BEFORE UPDATE ON "ShopSetting"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 21. WithdrawalMethod (no foreign keys)
-- ============================================================
CREATE TABLE "WithdrawalMethod" (
  "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "channel"     TEXT        NOT NULL,
  "accountName" TEXT        NOT NULL,
  "accountNo"   TEXT        NOT NULL,
  "bankName"    TEXT,
  "qrCode"      TEXT,
  "isDefault"   BOOLEAN     NOT NULL DEFAULT false,
  "enabled"     BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER "WithdrawalMethod_updatedAt"
  BEFORE UPDATE ON "WithdrawalMethod"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 22. WalletTransaction -> MerchantWallet (onDelete: Cascade)
-- ============================================================
CREATE TABLE "WalletTransaction" (
  "id"            TEXT             PRIMARY KEY DEFAULT gen_random_uuid(),
  "walletId"      TEXT             NOT NULL,
  "type"          TEXT             NOT NULL,
  "amount"        DOUBLE PRECISION  NOT NULL,
  "balanceBefore" DOUBLE PRECISION  NOT NULL,
  "balanceAfter"  DOUBLE PRECISION  NOT NULL,
  "orderId"       TEXT,
  "withdrawalId"  TEXT,
  "note"          TEXT,
  "createdAt"     TIMESTAMPTZ      NOT NULL DEFAULT now(),
  CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "MerchantWallet"("id") ON DELETE CASCADE
);

CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction" ("walletId", "createdAt");
CREATE INDEX "WalletTransaction_orderId_idx" ON "WalletTransaction" ("orderId");
CREATE INDEX "WalletTransaction_withdrawalId_idx" ON "WalletTransaction" ("withdrawalId");

-- ============================================================
-- 23. MemberLevel (no foreign keys)
-- ============================================================
CREATE TABLE "MemberLevel" (
  "id"              TEXT             PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"            TEXT             NOT NULL,
  "minSpend"        DOUBLE PRECISION  NOT NULL DEFAULT 0,
  "discountPercent" DOUBLE PRECISION  NOT NULL DEFAULT 100,
  "benefits"        TEXT             NOT NULL DEFAULT '[]',
  "enabled"         BOOLEAN          NOT NULL DEFAULT true,
  "sortOrder"       INTEGER          NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMPTZ      NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE TRIGGER "MemberLevel_updatedAt"
  BEFORE UPDATE ON "MemberLevel"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 24. ChatConversation -> User (CustomerConversations, Cascade),
--    User (MerchantConversations, Cascade), Product (SetNull)
-- ============================================================
CREATE TABLE "ChatConversation" (
  "id"         TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerId" TEXT        NOT NULL,
  "merchantId" TEXT        NOT NULL,
  "productId"  TEXT,
  "status"     TEXT        NOT NULL DEFAULT 'OPEN',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ChatConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "ChatConversation_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "ChatConversation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL
);

CREATE INDEX "ChatConversation_customerId_idx" ON "ChatConversation" ("customerId");
CREATE INDEX "ChatConversation_merchantId_idx" ON "ChatConversation" ("merchantId");
CREATE INDEX "ChatConversation_productId_idx" ON "ChatConversation" ("productId");

CREATE TRIGGER "ChatConversation_updatedAt"
  BEFORE UPDATE ON "ChatConversation"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 25. ChatMessage -> ChatConversation (Cascade), User (Cascade)
-- ============================================================
CREATE TABLE "ChatMessage" (
  "id"             TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" TEXT        NOT NULL,
  "senderId"       TEXT        NOT NULL,
  "content"        TEXT        NOT NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE,
  CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage" ("conversationId", "createdAt");
CREATE INDEX "ChatMessage_senderId_idx" ON "ChatMessage" ("senderId");

-- ============================================================
-- 26. ProductReview -> Order, User, Product, ProductSpec (all Cascade)
-- ============================================================
CREATE TABLE "ProductReview" (
  "id"                TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId"           TEXT        NOT NULL,
  "userId"            TEXT        NOT NULL,
  "productId"         TEXT        NOT NULL,
  "specId"            TEXT        NOT NULL,
  "overallScore"      INTEGER     NOT NULL,
  "cleanlinessScore"  INTEGER     NOT NULL,
  "sizeAccuracyScore" INTEGER     NOT NULL,
  "matchScore"        INTEGER     NOT NULL,
  "content"           TEXT        NOT NULL,
  "images"            TEXT        NOT NULL DEFAULT '[]',
  "status"            TEXT        NOT NULL DEFAULT 'PENDING',
  "merchantReply"     TEXT,
  "reviewedAt"        TIMESTAMPTZ,
  "reviewedById"      TEXT,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ProductReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE,
  CONSTRAINT "ProductReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
  CONSTRAINT "ProductReview_specId_fkey" FOREIGN KEY ("specId") REFERENCES "ProductSpec"("id") ON DELETE CASCADE,
  UNIQUE ("orderId")
);

CREATE INDEX "ProductReview_productId_status_idx" ON "ProductReview" ("productId", "status");
CREATE INDEX "ProductReview_userId_idx" ON "ProductReview" ("userId");

CREATE TRIGGER "ProductReview_updatedAt"
  BEFORE UPDATE ON "ProductReview"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 27. MerchantTenantReview -> Order (Cascade), User (Cascade x2)
-- ============================================================
CREATE TABLE "MerchantTenantReview" (
  "id"         TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId"    TEXT        NOT NULL,
  "merchantId" TEXT        NOT NULL,
  "customerId" TEXT        NOT NULL,
  "careScore"  INTEGER     NOT NULL,
  "comment"    TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "MerchantTenantReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE,
  CONSTRAINT "MerchantTenantReview_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "MerchantTenantReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE,
  UNIQUE ("orderId")
);

CREATE INDEX "MerchantTenantReview_merchantId_idx" ON "MerchantTenantReview" ("merchantId");
CREATE INDEX "MerchantTenantReview_customerId_idx" ON "MerchantTenantReview" ("customerId");

CREATE TRIGGER "MerchantTenantReview_updatedAt"
  BEFORE UPDATE ON "MerchantTenantReview"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 28. ExtensionReview -> Order (Cascade)
-- ============================================================
CREATE TABLE "ExtensionReview" (
  "id"              TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId"         TEXT        NOT NULL,
  "type"            TEXT        NOT NULL,
  "requestedEndDate" TIMESTAMPTZ NOT NULL,
  "proof"           TEXT,
  "fee"             DOUBLE PRECISION NOT NULL,
  "status"          TEXT        NOT NULL DEFAULT 'PENDING',
  "rejectReason"    TEXT,
  "reviewedAt"      TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ExtensionReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE
);

CREATE INDEX "ExtensionReview_orderId_status_idx" ON "ExtensionReview" ("orderId", "status");

CREATE TRIGGER "ExtensionReview_updatedAt"
  BEFORE UPDATE ON "ExtensionReview"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 29. StoreTemplate (no foreign keys)
-- ============================================================
CREATE TABLE "StoreTemplate" (
  "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"        TEXT        NOT NULL,
  "description" TEXT,
  "theme"       TEXT        NOT NULL DEFAULT 'default',
  "config"      TEXT        NOT NULL DEFAULT '{}',
  "isPreset"    BOOLEAN     NOT NULL DEFAULT false,
  "isActive"    BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER "StoreTemplate_updatedAt"
  BEFORE UPDATE ON "StoreTemplate"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 30. StoreDecoration (no foreign keys)
-- ============================================================
CREATE TABLE "StoreDecoration" (
  "id"         TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "templateId" TEXT,
  "name"       TEXT        NOT NULL,
  "startDate"  TIMESTAMPTZ,
  "endDate"    TIMESTAMPTZ,
  "components" TEXT        NOT NULL DEFAULT '[]',
  "isActive"   BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER "StoreDecoration_updatedAt"
  BEFORE UPDATE ON "StoreDecoration"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 31. StoreComponent (no foreign keys)
-- ============================================================
CREATE TABLE "StoreComponent" (
  "id"            TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  "type"          TEXT        NOT NULL,
  "name"          TEXT        NOT NULL,
  "icon"          TEXT,
  "defaultConfig" TEXT        NOT NULL DEFAULT '{}',
  "sortOrder"     INTEGER     NOT NULL DEFAULT 0,
  "enabled"       BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("type")
);

CREATE TRIGGER "StoreComponent_updatedAt"
  BEFORE UPDATE ON "StoreComponent"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
