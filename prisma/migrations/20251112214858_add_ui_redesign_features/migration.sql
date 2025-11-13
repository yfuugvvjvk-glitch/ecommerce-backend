/*
  Warnings:

  - You are about to drop the column `usageLimit` on the `Voucher` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DataItem" ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryName" TEXT,
ADD COLUMN     "deliveryPhone" TEXT,
ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'CASH_ON_DELIVERY',
ALTER COLUMN "status" SET DEFAULT 'PROCESSING';

-- AlterTable
ALTER TABLE "Voucher" DROP COLUMN "usageLimit",
ADD COLUMN     "maxUsage" INTEGER,
ALTER COLUMN "discountType" SET DEFAULT 'PERCENTAGE';

-- CreateTable
CREATE TABLE "UserVoucher" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoucherRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOffer" (
    "id" TEXT NOT NULL,
    "dataItemId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NavigationHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dataItemId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NavigationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserVoucher_orderId_key" ON "UserVoucher"("orderId");

-- CreateIndex
CREATE INDEX "UserVoucher_userId_idx" ON "UserVoucher"("userId");

-- CreateIndex
CREATE INDEX "UserVoucher_voucherId_idx" ON "UserVoucher"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "UserVoucher_userId_voucherId_key" ON "UserVoucher"("userId", "voucherId");

-- CreateIndex
CREATE INDEX "VoucherRequest_userId_idx" ON "VoucherRequest"("userId");

-- CreateIndex
CREATE INDEX "VoucherRequest_status_idx" ON "VoucherRequest"("status");

-- CreateIndex
CREATE INDEX "Offer_active_idx" ON "Offer"("active");

-- CreateIndex
CREATE INDEX "Offer_validFrom_idx" ON "Offer"("validFrom");

-- CreateIndex
CREATE INDEX "Offer_validUntil_idx" ON "Offer"("validUntil");

-- CreateIndex
CREATE INDEX "ProductOffer_dataItemId_idx" ON "ProductOffer"("dataItemId");

-- CreateIndex
CREATE INDEX "ProductOffer_offerId_idx" ON "ProductOffer"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOffer_dataItemId_offerId_key" ON "ProductOffer"("dataItemId", "offerId");

-- CreateIndex
CREATE INDEX "NavigationHistory_userId_viewedAt_idx" ON "NavigationHistory"("userId", "viewedAt");

-- CreateIndex
CREATE INDEX "NavigationHistory_dataItemId_idx" ON "NavigationHistory"("dataItemId");

-- AddForeignKey
ALTER TABLE "UserVoucher" ADD CONSTRAINT "UserVoucher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVoucher" ADD CONSTRAINT "UserVoucher_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVoucher" ADD CONSTRAINT "UserVoucher_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherRequest" ADD CONSTRAINT "VoucherRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOffer" ADD CONSTRAINT "ProductOffer_dataItemId_fkey" FOREIGN KEY ("dataItemId") REFERENCES "DataItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOffer" ADD CONSTRAINT "ProductOffer_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NavigationHistory" ADD CONSTRAINT "NavigationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NavigationHistory" ADD CONSTRAINT "NavigationHistory_dataItemId_fkey" FOREIGN KEY ("dataItemId") REFERENCES "DataItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
