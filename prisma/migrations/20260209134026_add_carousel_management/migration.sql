-- CreateTable
CREATE TABLE "CarouselItem" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "productId" TEXT,
    "mediaId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarouselItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarouselItem_position_key" ON "CarouselItem"("position");

-- CreateIndex
CREATE INDEX "CarouselItem_position_idx" ON "CarouselItem"("position");

-- CreateIndex
CREATE INDEX "CarouselItem_isActive_idx" ON "CarouselItem"("isActive");

-- CreateIndex
CREATE INDEX "CarouselItem_type_idx" ON "CarouselItem"("type");

-- CreateIndex
CREATE INDEX "CarouselItem_productId_idx" ON "CarouselItem"("productId");

-- CreateIndex
CREATE INDEX "CarouselItem_mediaId_idx" ON "CarouselItem"("mediaId");

-- CreateIndex
CREATE INDEX "CarouselItem_createdById_idx" ON "CarouselItem"("createdById");

-- AddForeignKey
ALTER TABLE "CarouselItem" ADD CONSTRAINT "CarouselItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DataItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarouselItem" ADD CONSTRAINT "CarouselItem_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarouselItem" ADD CONSTRAINT "CarouselItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
