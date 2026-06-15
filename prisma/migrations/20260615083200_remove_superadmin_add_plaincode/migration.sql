-- AlterEnum: Remove SUPERADMIN from Role
-- First update any rows using SUPERADMIN to ADMIN
UPDATE "User" SET "role" = 'ADMIN' WHERE "role" = 'SUPERADMIN';

-- Remove SUPERADMIN value from enum
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('OPERATOR', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'OPERATOR';
DROP TYPE "Role_old";

-- AlterTable: Add plainCode to AccessCode
ALTER TABLE "AccessCode" ADD COLUMN "plainCode" TEXT;
