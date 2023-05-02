/*
  Warnings:

  - You are about to alter the column `name` on the `api_userportfolio` table. The data in that column could be lost. The data in that column will be cast from `VarChar(22)` to `VarChar(20)`.

*/
-- AlterTable
ALTER TABLE "api_userportfolio" ALTER COLUMN "name" SET DATA TYPE VARCHAR(20);

-- CreateTable
CREATE TABLE "api_sess" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE INDEX "IDX_session_expire" ON "api_sess"("expire");
