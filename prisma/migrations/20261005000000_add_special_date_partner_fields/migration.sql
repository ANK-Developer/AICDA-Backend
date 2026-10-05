-- AlterTable
ALTER TABLE `Member` ADD COLUMN `specialDate` DATETIME(3) NULL,
    ADD COLUMN `specialDateNote` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Partner` ADD COLUMN `dateOfBirth` DATETIME(3) NULL,
    ADD COLUMN `district` VARCHAR(191) NULL,
    ADD COLUMN `specialDate` DATETIME(3) NULL,
    ADD COLUMN `specialDateNote` VARCHAR(191) NULL;
