-- AlterTable
ALTER TABLE `Member`
  ADD COLUMN `statusReason` TEXT NULL,
  ADD COLUMN `statusActionBy` VARCHAR(191) NULL,
  ADD COLUMN `statusActionAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Partner`
  ADD COLUMN `statusReason` TEXT NULL,
  ADD COLUMN `statusActionBy` VARCHAR(191) NULL,
  ADD COLUMN `statusActionAt` DATETIME(3) NULL;

-- `isActive` used to be switched off automatically on expiry. It now means only
-- the admin's manual status, so rows that were inactive merely because the plan
-- ended (or was never paid) go back to ACTIVE; expiry is calculated from the dates.
UPDATE `Member`
  SET `isActive` = true
  WHERE `isActive` = false
    AND (`validityTo` IS NULL OR `validityTo` < UTC_TIMESTAMP());

UPDATE `Partner`
  SET `isActive` = true
  WHERE `isActive` = false
    AND (`validityTo` IS NULL OR `validityTo` < UTC_TIMESTAMP());

-- What is still inactive was switched off by an admin before reasons were recorded.
UPDATE `Member`
  SET `statusReason` = 'Deactivated before reasons were recorded'
  WHERE `isActive` = false;

UPDATE `Partner`
  SET `statusReason` = 'Deactivated before reasons were recorded'
  WHERE `isActive` = false;
