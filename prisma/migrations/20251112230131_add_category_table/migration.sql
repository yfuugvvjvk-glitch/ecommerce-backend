/*
  Warnings:

  - You are about to drop the column `category` on the `DataItem` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `DataItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "DataItem_category_idx";

-- AlterTable
ALTER TABLE "DataItem" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameRo" TEXT,
    "nameEn" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "DataItem_categoryId_idx" ON "DataItem"("categoryId");

-- AddForeignKey
ALTER TABLE "DataItem" ADD CONSTRAINT "DataItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
