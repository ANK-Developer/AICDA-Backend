-- AlterTable
ALTER TABLE `Member` ADD COLUMN `specialDates` JSON NULL;
ALTER TABLE `Partner` ADD COLUMN `specialDates` JSON NULL;

-- Carry any existing single special date over into the new array
UPDATE `Member`
SET `specialDates` = JSON_ARRAY(JSON_OBJECT('id', UUID(), 'date', DATE_FORMAT(`specialDate`, '%Y-%m-%d'), 'note', `specialDateNote`))
WHERE `specialDate` IS NOT NULL;

UPDATE `Partner`
SET `specialDates` = JSON_ARRAY(JSON_OBJECT('id', UUID(), 'date', DATE_FORMAT(`specialDate`, '%Y-%m-%d'), 'note', `specialDateNote`))
WHERE `specialDate` IS NOT NULL;

-- DropColumns
ALTER TABLE `Member` DROP COLUMN `specialDate`, DROP COLUMN `specialDateNote`;
ALTER TABLE `Partner` DROP COLUMN `specialDate`, DROP COLUMN `specialDateNote`;
