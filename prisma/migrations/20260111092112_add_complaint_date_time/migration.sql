-- AlterTable
ALTER TABLE `announcements` ADD COLUMN `target` VARCHAR(191) NOT NULL DEFAULT 'login',
    ADD COLUMN `targetAudience` VARCHAR(191) NOT NULL DEFAULT 'all',
    MODIFY `title` VARCHAR(500) NOT NULL,
    MODIFY `message` TEXT NOT NULL;

-- CreateTable
CREATE TABLE `NotificationRead` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `announcementId` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `NotificationRead_userId_idx`(`userId`),
    UNIQUE INDEX `NotificationRead_announcementId_userId_key`(`announcementId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Complaint` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` VARCHAR(191) NULL,
    `mobileNumber` VARCHAR(20) NOT NULL,
    `whatsappNumber` VARCHAR(20) NULL,
    `message` TEXT NOT NULL,
    `complaintDate` DATETIME(3) NULL,
    `complaintTime` VARCHAR(10) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminNotes` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NotificationRead` ADD CONSTRAINT `NotificationRead_announcementId_fkey` FOREIGN KEY (`announcementId`) REFERENCES `Announcements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
