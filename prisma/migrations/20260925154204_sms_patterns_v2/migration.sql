-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ORDER_CANCELED';
ALTER TYPE "NotificationType" ADD VALUE 'ADMIN_RECEIPT_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'ADMIN_WALLET_PAID';

-- متن پیامک‌ها از شماره‌گذاری {1} به {0} (قالب ملی پیامک) و متغیرهای جدید
-- (نام مشتری) رفت؛ متن‌های قبلی دیگر معتبر نیستند و پیش‌فرض‌های تازه جایگزین می‌شوند.
DELETE FROM "Setting" WHERE "key" = 'sms.templates';
