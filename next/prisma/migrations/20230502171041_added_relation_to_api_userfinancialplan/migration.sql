/*
  Warnings:

  - Made the column `user_key` on table `api_userfinancialplan` required. This step will fail if there are existing NULL values in that column.
  - Made the column `plan` on table `api_userfinancialplan` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `api_userfinancialplan` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "api_userfinancialplan" ALTER COLUMN "user_key" SET NOT NULL,
ALTER COLUMN "user_key" SET DATA TYPE TEXT,
ALTER COLUMN "plan" SET NOT NULL,
ALTER COLUMN "name" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "api_userfinancialplan" ADD CONSTRAINT "api_userfinancialplan_user_key_fkey" FOREIGN KEY ("user_key") REFERENCES "api_user"("user_key") ON DELETE RESTRICT ON UPDATE CASCADE;
