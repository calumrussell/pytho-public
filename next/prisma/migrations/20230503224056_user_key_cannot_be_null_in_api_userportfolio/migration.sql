/*
  Warnings:

  - Made the column `user_key` on table `api_userportfolio` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "api_userportfolio" ALTER COLUMN "user_key" SET NOT NULL;
