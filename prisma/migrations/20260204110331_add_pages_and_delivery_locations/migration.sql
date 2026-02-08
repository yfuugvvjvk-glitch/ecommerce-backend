-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryLocationId" TEXT;

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "template" TEXT NOT NULL DEFAULT 'default',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageSection" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "settings" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'România',
    "coordinates" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deliveryRadius" DOUBLE PRECISION,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freeDeliveryThreshold" DOUBLE PRECISION,
    "workingHours" TEXT,
    "specialInstructions" TEXT,
    "contactPerson" TEXT,
    "isMainLocation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE INDEX "Page_slug_idx" ON "Page"("slug");

-- CreateIndex
CREATE INDEX "Page_isPublished_idx" ON "Page"("isPublished");

-- CreateIndex
CREATE INDEX "Page_createdById_idx" ON "Page"("createdById");

-- CreateIndex
CREATE INDEX "PageSection_pageId_idx" ON "PageSection"("pageId");

-- CreateIndex
CREATE INDEX "PageSection_position_idx" ON "PageSection"("position");

-- CreateIndex
CREATE INDEX "PageSection_isVisible_idx" ON "PageSection"("isVisible");

-- CreateIndex
CREATE INDEX "DeliveryLocation_isActive_idx" ON "DeliveryLocation"("isActive");

-- CreateIndex
CREATE INDEX "DeliveryLocation_city_idx" ON "DeliveryLocation"("city");

-- CreateIndex
CREATE INDEX "DeliveryLocation_isMainLocation_idx" ON "DeliveryLocation"("isMainLocation");

-- CreateIndex
CREATE UNIQUE INDEX "SiteConfig_key_key" ON "SiteConfig"("key");

-- CreateIndex
CREATE INDEX "SiteConfig_key_idx" ON "SiteConfig"("key");

-- CreateIndex
CREATE INDEX "SiteConfig_isPublic_idx" ON "SiteConfig"("isPublic");

-- CreateIndex
CREATE INDEX "Order_deliveryLocationId_idx" ON "Order"("deliveryLocationId");

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageSection" ADD CONSTRAINT "PageSection_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteConfig" ADD CONSTRAINT "SiteConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryLocationId_fkey" FOREIGN KEY ("deliveryLocationId") REFERENCES "DeliveryLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
