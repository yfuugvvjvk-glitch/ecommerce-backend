/*
  Warnings:

  - A unique constraint covering the columns `[userId,dataItemId,isGift]` on the table `CartItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CartItem_userId_dataItemId_key";

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_userId_dataItemId_isGift_key" ON "CartItem"("userId", "dataItemId", "isGift");
