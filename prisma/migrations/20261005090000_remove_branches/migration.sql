-- حذف قابلیت «شعب» (آدرس شعبه‌ها): الو کپسول شعبه‌ی جدا ندارد
DELETE FROM "SlugHistory" WHERE "entityType" = 'BRANCH';
DELETE FROM "Redirect" WHERE "fromPath" LIKE '/branches%' OR "toPath" LIKE '/branches%';

DROP TABLE "Branch";

-- مقدار BRANCH از enum حذف می‌شود (Postgres حذف مقدار enum را مستقیم پشتیبانی نمی‌کند)
ALTER TYPE "SlugEntityType" RENAME TO "SlugEntityType_old";
CREATE TYPE "SlugEntityType" AS ENUM ('PRODUCT', 'CATEGORY', 'PAGE');
ALTER TABLE "SlugHistory" ALTER COLUMN "entityType" TYPE "SlugEntityType" USING ("entityType"::text::"SlugEntityType");
DROP TYPE "SlugEntityType_old";
