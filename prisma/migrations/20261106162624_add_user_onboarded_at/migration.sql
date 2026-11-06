-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- Everyone who already has an account has been using Orbit, so they skip the
-- welcome setup. Only users created from now on see it.
UPDATE "User" SET "onboardedAt" = "createdAt";
