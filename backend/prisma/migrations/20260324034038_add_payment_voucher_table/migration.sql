-- CreateTable
CREATE TABLE `payment_vouchers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payment_record_id` INTEGER NOT NULL,
    `file_id` INTEGER NOT NULL,
    `remark` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payment_vouchers_payment_record_id_idx`(`payment_record_id`),
    INDEX `payment_vouchers_file_id_idx`(`file_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payment_vouchers` ADD CONSTRAINT `payment_vouchers_payment_record_id_fkey` FOREIGN KEY (`payment_record_id`) REFERENCES `payment_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_vouchers` ADD CONSTRAINT `payment_vouchers_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
