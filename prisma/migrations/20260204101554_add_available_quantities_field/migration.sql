-- AlterTable
ALTER TABLE "DataItem" ADD COLUMN     "advanceOrderDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "advanceOrderHours" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "allowFractional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "availableDeliveryDays" TEXT,
ADD COLUMN     "availableQuantities" TEXT,
ADD COLUMN     "availableStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "consumeBeforeNote" TEXT,
ADD COLUMN     "customDeliveryRules" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deliveryTimeDays" INTEGER,
ADD COLUMN     "deliveryTimeHours" INTEGER,
ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "isPerishable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastRestockDate" TIMESTAMP(3),
ADD COLUMN     "maxQuantity" DOUBLE PRECISION,
ADD COLUMN     "minQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "productionDate" TIMESTAMP(3),
ADD COLUMN     "quantityStep" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "requiresAdvanceOrder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reservedStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "restockAlert" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shelfLifeDays" INTEGER,
ADD COLUMN     "specialHandling" TEXT,
ADD COLUMN     "storageInstructions" TEXT,
ADD COLUMN     "totalOrdered" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unitName" TEXT NOT NULL DEFAULT 'bucată',
ADD COLUMN     "unitType" TEXT NOT NULL DEFAULT 'piece',
ADD COLUMN     "warrantyDays" INTEGER;

-- CreateTable
CREATE TABLE "SavedCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "cardHolder" TEXT NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "cardType" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FictiveCard" (
    "id" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "cardHolder" TEXT NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "cvv" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
    "cardType" TEXT NOT NULL DEFAULT 'VISA',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FictiveCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fictiveCardId" TEXT,
    "testCardId" TEXT,
    "orderId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "cardLast4" TEXT,
    "cardType" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCard" (
    "id" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "cardHolder" TEXT NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "cvv" TEXT NOT NULL,
    "cardType" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'DIRECT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRoomMember" (
    "id" TEXT NOT NULL,
    "chatRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChatRoomMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "chatRoomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessageRead" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessageRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "dataItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "orderId" TEXT,
    "userId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverySettings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deliveryTimeHours" INTEGER,
    "deliveryTimeDays" INTEGER,
    "availableDeliveryDays" TEXT,
    "deliveryAreas" TEXT,
    "minimumOrderValue" DOUBLE PRECISION,
    "deliveryCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freeDeliveryThreshold" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "icon" TEXT,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedCard_userId_idx" ON "SavedCard"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FictiveCard_cardNumber_key" ON "FictiveCard"("cardNumber");

-- CreateIndex
CREATE INDEX "FictiveCard_cardNumber_idx" ON "FictiveCard"("cardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CardTransaction_orderId_key" ON "CardTransaction"("orderId");

-- CreateIndex
CREATE INDEX "CardTransaction_userId_idx" ON "CardTransaction"("userId");

-- CreateIndex
CREATE INDEX "CardTransaction_fictiveCardId_idx" ON "CardTransaction"("fictiveCardId");

-- CreateIndex
CREATE INDEX "CardTransaction_testCardId_idx" ON "CardTransaction"("testCardId");

-- CreateIndex
CREATE INDEX "CardTransaction_orderId_idx" ON "CardTransaction"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "TestCard_cardNumber_key" ON "TestCard"("cardNumber");

-- CreateIndex
CREATE INDEX "TestCard_cardNumber_idx" ON "TestCard"("cardNumber");

-- CreateIndex
CREATE INDEX "TestCard_isActive_idx" ON "TestCard"("isActive");

-- CreateIndex
CREATE INDEX "ChatRoom_type_idx" ON "ChatRoom"("type");

-- CreateIndex
CREATE INDEX "ChatRoom_isActive_idx" ON "ChatRoom"("isActive");

-- CreateIndex
CREATE INDEX "ChatRoom_createdById_idx" ON "ChatRoom"("createdById");

-- CreateIndex
CREATE INDEX "ChatRoomMember_chatRoomId_idx" ON "ChatRoomMember"("chatRoomId");

-- CreateIndex
CREATE INDEX "ChatRoomMember_userId_idx" ON "ChatRoomMember"("userId");

-- CreateIndex
CREATE INDEX "ChatRoomMember_isActive_idx" ON "ChatRoomMember"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ChatRoomMember_chatRoomId_userId_key" ON "ChatRoomMember"("chatRoomId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessage_chatRoomId_idx" ON "ChatMessage"("chatRoomId");

-- CreateIndex
CREATE INDEX "ChatMessage_senderId_idx" ON "ChatMessage"("senderId");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_isDeleted_idx" ON "ChatMessage"("isDeleted");

-- CreateIndex
CREATE INDEX "ChatMessageRead_messageId_idx" ON "ChatMessageRead"("messageId");

-- CreateIndex
CREATE INDEX "ChatMessageRead_userId_idx" ON "ChatMessageRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessageRead_messageId_userId_key" ON "ChatMessageRead"("messageId", "userId");

-- CreateIndex
CREATE INDEX "StockMovement_dataItemId_idx" ON "StockMovement"("dataItemId");

-- CreateIndex
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeliverySettings_name_key" ON "DeliverySettings"("name");

-- CreateIndex
CREATE INDEX "DeliverySettings_isActive_idx" ON "DeliverySettings"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_name_key" ON "PaymentMethod"("name");

-- CreateIndex
CREATE INDEX "PaymentMethod_isActive_idx" ON "PaymentMethod"("isActive");

-- CreateIndex
CREATE INDEX "PaymentMethod_type_idx" ON "PaymentMethod"("type");

-- CreateIndex
CREATE INDEX "DataItem_isPerishable_idx" ON "DataItem"("isPerishable");

-- CreateIndex
CREATE INDEX "DataItem_requiresAdvanceOrder_idx" ON "DataItem"("requiresAdvanceOrder");

-- AddForeignKey
ALTER TABLE "SavedCard" ADD CONSTRAINT "SavedCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTransaction" ADD CONSTRAINT "CardTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTransaction" ADD CONSTRAINT "CardTransaction_fictiveCardId_fkey" FOREIGN KEY ("fictiveCardId") REFERENCES "FictiveCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTransaction" ADD CONSTRAINT "CardTransaction_testCardId_fkey" FOREIGN KEY ("testCardId") REFERENCES "TestCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTransaction" ADD CONSTRAINT "CardTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoomMember" ADD CONSTRAINT "ChatRoomMember_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoomMember" ADD CONSTRAINT "ChatRoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessageRead" ADD CONSTRAINT "ChatMessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_dataItemId_fkey" FOREIGN KEY ("dataItemId") REFERENCES "DataItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
