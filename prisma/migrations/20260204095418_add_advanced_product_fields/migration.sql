-- AlterTable
ALTER TABLE "DataItem" ADD COLUMN     "availabilitySchedule" TEXT,
ADD COLUMN     "availabilityType" TEXT NOT NULL DEFAULT 'always';

-- CreateIndex
CREATE INDEX "DataItem_availabilityType_idx" ON "DataItem"("availabilityType");