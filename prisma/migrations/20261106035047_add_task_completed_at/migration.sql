-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Task_userId_completedAt_idx" ON "Task"("userId", "completedAt");

-- Backfill: tasks completed before this column existed were stamped by
-- updatedAt when they changed to COMPLETED, which is the best record we have.
UPDATE "Task" SET "completedAt" = "updatedAt" WHERE "status" = 'COMPLETED';
