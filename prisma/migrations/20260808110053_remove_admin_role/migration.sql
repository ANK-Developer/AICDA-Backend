-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN');
ALTER TABLE "public"."Admin" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Admin" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "Admin" ALTER COLUMN "role" SET DEFAULT 'SUPER_ADMIN';
COMMIT;
