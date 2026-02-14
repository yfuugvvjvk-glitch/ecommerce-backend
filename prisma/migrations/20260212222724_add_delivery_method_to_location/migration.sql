-- AlterTable
ALTER TABLE "DeliveryLocation" ADD COLUMN     "deliveryMethodId" TEXT;

-- CreateIndex
CREATE INDEX "DeliveryLocation_deliveryMethodId_idx" ON "DeliveryLocation"("deliveryMethodId");

-- AddForeignKey
ALTER TABLE "DeliveryLocation" ADD CONSTRAINT "DeliveryLocation_deliveryMethodId_fkey" FOREIGN KEY ("deliveryMethodId") REFERENCES "DeliverySettings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
