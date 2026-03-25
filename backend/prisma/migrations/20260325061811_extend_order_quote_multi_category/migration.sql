/*
  Warnings:

  - You are about to drop the column `fabric_id` on the `quotes` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `quotes` table. All the data in the column will be lost.
  - You are about to drop the column `unit_price` on the `quotes` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `order_items` DROP FOREIGN KEY `order_items_fabric_id_fkey`;

-- DropForeignKey
ALTER TABLE `quotes` DROP FOREIGN KEY `quotes_fabric_id_fkey`;

-- DropIndex
DROP INDEX `quotes_fabric_id_idx` ON `quotes`;

-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `product_id` INTEGER NULL,
    ADD COLUMN `quote_item_id` INTEGER NULL,
    ADD COLUMN `unit` VARCHAR(191) NOT NULL DEFAULT 'meter',
    MODIFY `fabric_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `quote_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quote_id` INTEGER NOT NULL,
    `fabric_id` INTEGER NULL,
    `product_id` INTEGER NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'meter',
    `is_converted` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `quote_items_quote_id_idx`(`quote_id`),
    INDEX `quote_items_fabric_id_idx`(`fabric_id`),
    INDEX `quote_items_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- DataMigration: move existing quote data to quote_items before dropping columns
INSERT INTO quote_items (quote_id, fabric_id, quantity, unit_price, subtotal, unit, is_converted, created_at, updated_at)
SELECT id, fabric_id, quantity, unit_price, total_price, 'meter',
  CASE WHEN status = 'converted' THEN 1 ELSE 0 END,
  created_at, updated_at
FROM quotes WHERE fabric_id IS NOT NULL;

-- AlterTable: now safe to drop columns after data migration
ALTER TABLE `quotes` DROP COLUMN `fabric_id`,
    DROP COLUMN `quantity`,
    DROP COLUMN `unit_price`;

-- CreateIndex
CREATE INDEX `order_items_product_id_idx` ON `order_items`(`product_id`);

-- CreateIndex
CREATE INDEX `order_items_quote_item_id_idx` ON `order_items`(`quote_item_id`);

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_fabric_id_fkey` FOREIGN KEY (`fabric_id`) REFERENCES `fabrics`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_quote_item_id_fkey` FOREIGN KEY (`quote_item_id`) REFERENCES `quote_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_items` ADD CONSTRAINT `quote_items_quote_id_fkey` FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_items` ADD CONSTRAINT `quote_items_fabric_id_fkey` FOREIGN KEY (`fabric_id`) REFERENCES `fabrics`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quote_items` ADD CONSTRAINT `quote_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CHECK constraints: XOR enforcement (exactly one of fabric_id or product_id)
ALTER TABLE `order_items` ADD CONSTRAINT `chk_order_item_product_xor`
  CHECK (
    (fabric_id IS NOT NULL AND product_id IS NULL) OR
    (fabric_id IS NULL AND product_id IS NOT NULL)
  );

ALTER TABLE `quote_items` ADD CONSTRAINT `chk_quote_item_product_xor`
  CHECK (
    (fabric_id IS NOT NULL AND product_id IS NULL) OR
    (fabric_id IS NULL AND product_id IS NOT NULL)
  );
