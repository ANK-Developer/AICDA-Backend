/*
  Warnings:

  - You are about to drop the `Video` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "GalleryResourceType" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "Gallery" ADD COLUMN     "resourceType" "GalleryResourceType" NOT NULL DEFAULT 'IMAGE';

-- DropTable
DROP TABLE "Video";
