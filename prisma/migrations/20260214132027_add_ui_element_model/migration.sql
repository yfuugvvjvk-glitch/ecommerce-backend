-- CreateTable
CREATE TABLE "UIElement" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "position" TEXT NOT NULL DEFAULT 'floating',
    "page" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "size" TEXT NOT NULL DEFAULT 'medium',
    "color" TEXT NOT NULL DEFAULT '#10B981',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "action" TEXT,
    "settings" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UIElement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UIElement_type_idx" ON "UIElement"("type");

-- CreateIndex
CREATE INDEX "UIElement_position_idx" ON "UIElement"("position");

-- CreateIndex
CREATE INDEX "UIElement_isVisible_idx" ON "UIElement"("isVisible");

-- CreateIndex
CREATE INDEX "UIElement_order_idx" ON "UIElement"("order");

-- CreateIndex
CREATE INDEX "UIElement_createdById_idx" ON "UIElement"("createdById");
