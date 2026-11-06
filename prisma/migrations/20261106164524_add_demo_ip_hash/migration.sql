-- AlterTable
ALTER TABLE "User" ADD COLUMN     "demoIpHash" TEXT;

-- CreateIndex
CREATE INDEX "User_demoIpHash_createdAt_idx" ON "User"("demoIpHash", "createdAt");
