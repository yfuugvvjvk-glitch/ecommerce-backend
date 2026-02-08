-- AlterTable
ALTER TABLE "DataItem" ADD COLUMN     "carouselOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "showInCarousel" BOOLEAN NOT NULL DEFAULT false;
