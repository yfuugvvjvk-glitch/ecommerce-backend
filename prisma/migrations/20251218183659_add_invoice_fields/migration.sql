/*
  Warnings:

  - A unique constraint covering the columns `[invoiceNumber]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "invoiceGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" DOUBLE PRECISION,
ADD COLUMN     "tax" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Order_invoiceNumber_idx" ON "Order"("invoiceNumber");
