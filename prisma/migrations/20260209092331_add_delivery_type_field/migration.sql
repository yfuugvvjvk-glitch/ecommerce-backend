-- AlterTable
ALTER TABLE "DeliverySettings" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'courier';

-- CreateIndex
CREATE INDEX "DeliverySettings_type_idx" ON "DeliverySettings"("type");
