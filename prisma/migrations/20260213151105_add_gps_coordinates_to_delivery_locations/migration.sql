-- AlterTable
ALTER TABLE "DeliveryLocation" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "showRadiusOnMap" BOOLEAN NOT NULL DEFAULT true;
