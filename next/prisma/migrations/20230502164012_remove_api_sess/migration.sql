/*
  Warnings:

  - You are about to drop the `api_sess` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "api_userportfolio" ALTER COLUMN "name" SET DATA TYPE VARCHAR(22);

-- DropTable
DROP TABLE "api_sess";
