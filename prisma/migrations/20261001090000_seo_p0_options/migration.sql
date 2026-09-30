-- DropIndex
DROP INDEX "ProductVariant_productId_unitValue_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "h1" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "optionsSnapshot" JSONB,
ALTER COLUMN "unitValueSnapshot" DROP NOT NULL,
ALTER COLUMN "unitSnapshot" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "pairedProductId" TEXT,
ADD COLUMN     "priceUpdatedAt" TIMESTAMPTZ(3),
ALTER COLUMN "unit" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "optionKey" TEXT NOT NULL DEFAULT 'default',
ALTER COLUMN "unitValue" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ShippingMethod" ADD COLUMN     "businessHoursOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deliveryEstimate" TEXT;

-- CreateTable
CREATE TABLE "ProductOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOptionValue" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantOptionValue" (
    "variantId" TEXT NOT NULL,
    "optionValueId" TEXT NOT NULL,

    CONSTRAINT "VariantOptionValue_pkey" PRIMARY KEY ("variantId","optionValueId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductOption_productId_code_key" ON "ProductOption"("productId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptionValue_optionId_code_key" ON "ProductOptionValue"("optionId", "code");

-- CreateIndex
CREATE INDEX "VariantOptionValue_optionValueId_idx" ON "VariantOptionValue"("optionValueId");

-- DataMigration: variantهای موجود (مدل قبلی: یکتایی بر اساس unitValue)
-- محصول تک‌variant ⇒ `default`؛ چند variant بدون گزینه ⇒ `legacy:{unitValue}` (تا با گروه گزینه بازسازی شوند)
UPDATE "ProductVariant" v
SET "optionKey" = CASE
  WHEN (SELECT COUNT(*) FROM "ProductVariant" x WHERE x."productId" = v."productId") = 1 THEN 'default'
  ELSE 'legacy:' || COALESCE(v."unitValue"::text, v."id")
END;

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_optionKey_key" ON "ProductVariant"("productId", "optionKey");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_pairedProductId_fkey" FOREIGN KEY ("pairedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProductOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantOptionValue" ADD CONSTRAINT "VariantOptionValue_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantOptionValue" ADD CONSTRAINT "VariantOptionValue_optionValueId_fkey" FOREIGN KEY ("optionValueId") REFERENCES "ProductOptionValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

