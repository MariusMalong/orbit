-- AlterTable
ALTER TABLE "FixedCommitment" ADD COLUMN     "repeatsWeekly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "skippedStarts" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[];
