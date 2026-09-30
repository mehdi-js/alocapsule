-- AlterTable
ALTER TABLE "ShippingMethod" ADD COLUMN     "provinces" TEXT[] DEFAULT ARRAY[]::TEXT[];
