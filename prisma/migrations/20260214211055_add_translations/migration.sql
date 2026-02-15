-- AlterTable
ALTER TABLE "DataItem" ADD COLUMN     "contentEn" TEXT,
ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "titleEn" TEXT;

-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'automatic',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Translation_entityType_entityId_idx" ON "Translation"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Translation_locale_idx" ON "Translation"("locale");

-- CreateIndex
CREATE INDEX "Translation_status_idx" ON "Translation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_entityType_entityId_field_locale_key" ON "Translation"("entityType", "entityId", "field", "locale");
