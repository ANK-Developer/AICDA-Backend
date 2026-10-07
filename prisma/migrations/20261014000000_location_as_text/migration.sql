-- State / City move from lookup tables to plain text columns on Member and
-- Partner. Existing values are copied over before the old columns are dropped.

-- AlterTable
ALTER TABLE `Member` ADD COLUMN `state` VARCHAR(191) NULL,
    ADD COLUMN `city` VARCHAR(191) NULL;

ALTER TABLE `Partner` ADD COLUMN `state` VARCHAR(191) NULL,
    ADD COLUMN `city` VARCHAR(191) NULL;

-- Copy the saved names across
UPDATE `Member` m
    LEFT JOIN `State` s ON s.`id` = m.`stateId`
    LEFT JOIN `City` c ON c.`id` = m.`cityId`
SET m.`state` = s.`stateName`, m.`city` = c.`cityName`;

UPDATE `Partner` p
    LEFT JOIN `State` s ON s.`id` = p.`stateId`
    LEFT JOIN `City` c ON c.`id` = p.`cityId`
SET p.`state` = s.`stateName`, p.`city` = c.`cityName`;

-- DropForeignKey
ALTER TABLE `Member` DROP FOREIGN KEY `Member_stateId_fkey`;
ALTER TABLE `Member` DROP FOREIGN KEY `Member_cityId_fkey`;
ALTER TABLE `Partner` DROP FOREIGN KEY `Partner_stateId_fkey`;
ALTER TABLE `Partner` DROP FOREIGN KEY `Partner_cityId_fkey`;
ALTER TABLE `City` DROP FOREIGN KEY `City_stateId_fkey`;

-- DropIndex
DROP INDEX `Member_stateId_idx` ON `Member`;
DROP INDEX `Member_cityId_idx` ON `Member`;
DROP INDEX `Partner_stateId_idx` ON `Partner`;
DROP INDEX `Partner_cityId_idx` ON `Partner`;

-- AlterTable
ALTER TABLE `Member` DROP COLUMN `stateId`,
    DROP COLUMN `cityId`;

ALTER TABLE `Partner` DROP COLUMN `stateId`,
    DROP COLUMN `cityId`;

-- DropTable
DROP TABLE `City`;
DROP TABLE `State`;

-- CreateIndex
CREATE INDEX `Member_state_idx` ON `Member`(`state`);
CREATE INDEX `Member_district_idx` ON `Member`(`district`);
CREATE INDEX `Member_city_idx` ON `Member`(`city`);
CREATE INDEX `Partner_state_idx` ON `Partner`(`state`);
CREATE INDEX `Partner_district_idx` ON `Partner`(`district`);
CREATE INDEX `Partner_city_idx` ON `Partner`(`city`);
