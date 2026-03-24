/*
  Warnings:

  - A unique constraint covering the columns `[customer_id,product_id]` on the table `customer_pricing` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `customer_pricing` ADD COLUMN `product_id` INTEGER NULL,
    MODIFY `fabric_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `sub_category` VARCHAR(191) NOT NULL,
    `model_number` VARCHAR(191) NULL,
    `specification` VARCHAR(191) NULL,
    `default_price` DECIMAL(10, 2) NULL,
    `specs` JSON NULL,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_product_code_key`(`product_code`),
    INDEX `products_product_code_idx`(`product_code`),
    INDEX `products_name_idx`(`name`),
    INDEX `products_category_idx`(`category`),
    INDEX `products_sub_category_idx`(`sub_category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_suppliers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `supplier_id` INTEGER NOT NULL,
    `purchase_price` DECIMAL(10, 2) NOT NULL,
    `min_order_qty` DECIMAL(10, 2) NULL,
    `lead_time_days` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `product_suppliers_product_id_idx`(`product_id`),
    INDEX `product_suppliers_supplier_id_idx`(`supplier_id`),
    UNIQUE INDEX `product_suppliers_product_id_supplier_id_key`(`product_id`, `supplier_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_bundles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bundle_code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `total_price` DECIMAL(12, 2) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_bundles_bundle_code_key`(`bundle_code`),
    INDEX `product_bundles_bundle_code_idx`(`bundle_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_bundle_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bundle_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,

    INDEX `product_bundle_items_bundle_id_idx`(`bundle_id`),
    INDEX `product_bundle_items_product_id_idx`(`product_id`),
    UNIQUE INDEX `product_bundle_items_bundle_id_product_id_key`(`bundle_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `customer_pricing_product_id_idx` ON `customer_pricing`(`product_id`);

-- CreateIndex
CREATE UNIQUE INDEX `customer_pricing_customer_id_product_id_key` ON `customer_pricing`(`customer_id`, `product_id`);

-- AddForeignKey
ALTER TABLE `customer_pricing` ADD CONSTRAINT `customer_pricing_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_suppliers` ADD CONSTRAINT `product_suppliers_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_suppliers` ADD CONSTRAINT `product_suppliers_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_bundle_items` ADD CONSTRAINT `product_bundle_items_bundle_id_fkey` FOREIGN KEY (`bundle_id`) REFERENCES `product_bundles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_bundle_items` ADD CONSTRAINT `product_bundle_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
