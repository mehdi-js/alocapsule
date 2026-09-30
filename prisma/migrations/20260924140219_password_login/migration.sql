-- CreateEnum
CREATE TYPE "LoginMethod" AS ENUM ('OTP', 'PASSWORD');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "method" "LoginMethod" NOT NULL DEFAULT 'OTP';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordChangedAt" TIMESTAMPTZ(3),
ADD COLUMN     "passwordHash" TEXT;
