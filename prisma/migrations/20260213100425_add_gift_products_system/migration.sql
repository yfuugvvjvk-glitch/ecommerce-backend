-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "giftRuleId" TEXT,
ADD COLUMN     "isGift" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "giftRuleId" TEXT,
ADD COLUMN     "isGift" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalPrice" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "GiftRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "conditionLogic" TEXT NOT NULL DEFAULT 'AND',
    "maxUsesPerCustomer" INTEGER,
    "maxTotalUses" INTEGER,
    "currentTotalUses" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCondition" (
    "id" TEXT NOT NULL,
    "giftRuleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "minAmount" DOUBLE PRECISION,
    "productId" TEXT,
    "minQuantity" INTEGER DEFAULT 1,
    "categoryId" TEXT,
    "minCategoryAmount" DOUBLE PRECISION,
    "parentConditionId" TEXT,
    "logic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftProduct" (
    "id" TEXT NOT NULL,
    "giftRuleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "maxQuantityPerOrder" INTEGER NOT NULL DEFAULT 1,
    "remainingStock" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftRuleUsage" (
    "id" TEXT NOT NULL,
    "giftRuleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftRuleUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GiftRule_isActive_idx" ON "GiftRule"("isActive");

-- CreateIndex
CREATE INDEX "GiftRule_priority_idx" ON "GiftRule"("priority");

-- CreateIndex
CREATE INDEX "GiftRule_validFrom_idx" ON "GiftRule"("validFrom");

-- CreateIndex
CREATE INDEX "GiftRule_validUntil_idx" ON "GiftRule"("validUntil");

-- CreateIndex
CREATE INDEX "GiftRule_createdById_idx" ON "GiftRule"("createdById");

-- CreateIndex
CREATE INDEX "GiftCondition_giftRuleId_idx" ON "GiftCondition"("giftRuleId");

-- CreateIndex
CREATE INDEX "GiftCondition_type_idx" ON "GiftCondition"("type");

-- CreateIndex
CREATE INDEX "GiftCondition_productId_idx" ON "GiftCondition"("productId");

-- CreateIndex
CREATE INDEX "GiftCondition_categoryId_idx" ON "GiftCondition"("categoryId");

-- CreateIndex
CREATE INDEX "GiftCondition_parentConditionId_idx" ON "GiftCondition"("parentConditionId");

-- CreateIndex
CREATE INDEX "GiftProduct_giftRuleId_idx" ON "GiftProduct"("giftRuleId");

-- CreateIndex
CREATE INDEX "GiftProduct_productId_idx" ON "GiftProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftProduct_giftRuleId_productId_key" ON "GiftProduct"("giftRuleId", "productId");

-- CreateIndex
CREATE INDEX "GiftRuleUsage_giftRuleId_idx" ON "GiftRuleUsage"("giftRuleId");

-- CreateIndex
CREATE INDEX "GiftRuleUsage_userId_idx" ON "GiftRuleUsage"("userId");

-- CreateIndex
CREATE INDEX "GiftRuleUsage_orderId_idx" ON "GiftRuleUsage"("orderId");

-- CreateIndex
CREATE INDEX "GiftRuleUsage_usedAt_idx" ON "GiftRuleUsage"("usedAt");

-- CreateIndex
CREATE INDEX "CartItem_isGift_idx" ON "CartItem"("isGift");

-- CreateIndex
CREATE INDEX "CartItem_giftRuleId_idx" ON "CartItem"("giftRuleId");

-- CreateIndex
CREATE INDEX "OrderItem_isGift_idx" ON "OrderItem"("isGift");

-- CreateIndex
CREATE INDEX "OrderItem_giftRuleId_idx" ON "OrderItem"("giftRuleId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_giftRuleId_fkey" FOREIGN KEY ("giftRuleId") REFERENCES "GiftRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_giftRuleId_fkey" FOREIGN KEY ("giftRuleId") REFERENCES "GiftRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftRule" ADD CONSTRAINT "GiftRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCondition" ADD CONSTRAINT "GiftCondition_giftRuleId_fkey" FOREIGN KEY ("giftRuleId") REFERENCES "GiftRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCondition" ADD CONSTRAINT "GiftCondition_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DataItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCondition" ADD CONSTRAINT "GiftCondition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCondition" ADD CONSTRAINT "GiftCondition_parentConditionId_fkey" FOREIGN KEY ("parentConditionId") REFERENCES "GiftCondition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftProduct" ADD CONSTRAINT "GiftProduct_giftRuleId_fkey" FOREIGN KEY ("giftRuleId") REFERENCES "GiftRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftProduct" ADD CONSTRAINT "GiftProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DataItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftRuleUsage" ADD CONSTRAINT "GiftRuleUsage_giftRuleId_fkey" FOREIGN KEY ("giftRuleId") REFERENCES "GiftRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftRuleUsage" ADD CONSTRAINT "GiftRuleUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftRuleUsage" ADD CONSTRAINT "GiftRuleUsage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftRuleUsage" ADD CONSTRAINT "GiftRuleUsage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DataItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
