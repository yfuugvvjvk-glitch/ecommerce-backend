-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryMethod" TEXT NOT NULL DEFAULT 'courier',
ALTER COLUMN "paymentMethod" SET DEFAULT 'cash';
