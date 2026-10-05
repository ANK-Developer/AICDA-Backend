-- Existing enquiries were stored with the free-text status "pending"; they become NEW.
UPDATE `Enquiry` SET `status` = 'NEW' WHERE `status` NOT IN ('IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- AlterTable
ALTER TABLE `Enquiry` MODIFY `status` ENUM('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'NEW';
