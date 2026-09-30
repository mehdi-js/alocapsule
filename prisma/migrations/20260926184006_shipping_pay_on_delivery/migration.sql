-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingPayOnDelivery" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ShippingMethod" ADD COLUMN     "payOnDelivery" BOOLEAN NOT NULL DEFAULT false;
