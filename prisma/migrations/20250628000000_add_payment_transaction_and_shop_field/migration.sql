-- AlterTable
ALTER TABLE `Product` ADD COLUMN `showInShop` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `PaymentTransaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `externalRef` VARCHAR(255) NOT NULL,
    `mobileNumber` VARCHAR(20) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'GHS',
    `channel` VARCHAR(50) NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `productId` INTEGER NULL,
    `productName` VARCHAR(255) NULL,
    `orderId` INTEGER NULL,
    `moolreCode` VARCHAR(255) NULL,
    `moolreMessage` TEXT NULL,
    `moolreSessionId` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PaymentTransaction_externalRef_key`(`externalRef`),
    INDEX `PaymentTransaction_externalRef_idx`(`externalRef`),
    INDEX `PaymentTransaction_mobileNumber_idx`(`mobileNumber`),
    INDEX `PaymentTransaction_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
