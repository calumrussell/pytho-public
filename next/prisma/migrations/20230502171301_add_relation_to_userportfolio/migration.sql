/*
  Warnings:

  - Made the column `user_key` on table `api_userportfolio` required. This step will fail if there are existing NULL values in that column.
  - Made the column `portfolio` on table `api_userportfolio` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `api_userportfolio` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "api_userportfolio" ALTER COLUMN "user_key" SET NOT NULL,
ALTER COLUMN "user_key" SET DATA TYPE TEXT,
ALTER COLUMN "portfolio" SET NOT NULL,
ALTER COLUMN "name" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "api_userportfolio" ADD CONSTRAINT "api_userportfolio_user_key_fkey" FOREIGN KEY ("user_key") REFERENCES "api_user"("user_key") ON DELETE RESTRICT ON UPDATE CASCADE;
