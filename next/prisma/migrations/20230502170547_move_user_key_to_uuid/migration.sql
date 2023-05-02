/*
  Warnings:

  - The primary key for the `api_user` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `api_user` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "api_userfinancialplan" DROP CONSTRAINT "fk_user_key";

-- DropForeignKey
ALTER TABLE "api_userportfolio" DROP CONSTRAINT "fk_user_key";

-- DropIndex
DROP INDEX "api_user_userkey";

-- AlterTable
ALTER TABLE "api_user" DROP CONSTRAINT "api_user_pkey",
DROP COLUMN "id",
ALTER COLUMN "user_key" SET DATA TYPE TEXT,
ADD CONSTRAINT "api_user_pkey" PRIMARY KEY ("user_key");
