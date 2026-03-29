-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `user_name` VARCHAR(100) NOT NULL,
    `action` VARCHAR(20) NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` INTEGER NOT NULL,
    `changes` JSON NOT NULL,
    `ip` VARCHAR(45) NOT NULL DEFAULT '',
    `correlation_id` VARCHAR(36) NOT NULL DEFAULT '',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_entity_type_created_at_idx`(`entity_type`, `created_at`),
    INDEX `audit_logs_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `audit_logs_action_created_at_idx`(`action`, `created_at`),
    INDEX `audit_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- DropColumn (resolve schema drift from soft_delete_migration)
ALTER TABLE `fabrics` DROP COLUMN `unarchived`;

-- DropColumn
ALTER TABLE `products` DROP COLUMN `unarchived`;

-- DropColumn
ALTER TABLE `suppliers` DROP COLUMN `unarchived`;
