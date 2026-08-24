-- CreateIndex
CREATE INDEX `Enquiry_status_idx` ON `Enquiry`(`status`);

-- CreateIndex
CREATE INDEX `Enquiry_createdAt_idx` ON `Enquiry`(`createdAt`);

-- CreateIndex
CREATE INDEX `Member_isActive_idx` ON `Member`(`isActive`);

-- CreateIndex
CREATE INDEX `Partner_isActive_idx` ON `Partner`(`isActive`);

-- RenameIndex
ALTER TABLE `Member` RENAME INDEX `Member_cityId_fkey` TO `Member_cityId_idx`;

-- RenameIndex
ALTER TABLE `Member` RENAME INDEX `Member_stateId_fkey` TO `Member_stateId_idx`;

-- RenameIndex
ALTER TABLE `MemberRenewal` RENAME INDEX `MemberRenewal_memberId_fkey` TO `MemberRenewal_memberId_idx`;

-- RenameIndex
ALTER TABLE `Partner` RENAME INDEX `Partner_cityId_fkey` TO `Partner_cityId_idx`;

-- RenameIndex
ALTER TABLE `Partner` RENAME INDEX `Partner_stateId_fkey` TO `Partner_stateId_idx`;

-- RenameIndex
ALTER TABLE `PartnerRenewal` RENAME INDEX `PartnerRenewal_partnerId_fkey` TO `PartnerRenewal_partnerId_idx`;
