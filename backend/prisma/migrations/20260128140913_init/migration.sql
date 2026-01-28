-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `wework_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `avatar` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_wework_id_key`(`wework_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fabrics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fabric_code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `material` JSON NULL,
    `composition` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `weight` DECIMAL(8, 2) NULL,
    `width` DECIMAL(8, 2) NULL,
    `thickness` VARCHAR(191) NULL,
    `hand_feel` VARCHAR(191) NULL,
    `gloss_level` VARCHAR(191) NULL,
    `application` JSON NULL,
    `default_price` DECIMAL(10, 2) NULL,
    `default_lead_time` INTEGER NULL,
    `description` TEXT NULL,
    `tags` JSON NULL,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `fabrics_fabric_code_key`(`fabric_code`),
    INDEX `fabrics_fabric_code_idx`(`fabric_code`),
    INDEX `fabrics_name_idx`(`name`),
    INDEX `fabrics_color_idx`(`color`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fabric_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fabric_id` INTEGER NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fabric_images_fabric_id_idx`(`fabric_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppliers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_name` VARCHAR(191) NOT NULL,
    `contact_name` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `wechat` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `bill_receive_type` VARCHAR(191) NULL,
    `settle_type` VARCHAR(191) NOT NULL DEFAULT 'prepay',
    `credit_days` INTEGER NULL,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `suppliers_company_name_key`(`company_name`),
    INDEX `suppliers_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fabric_suppliers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fabric_id` INTEGER NOT NULL,
    `supplier_id` INTEGER NOT NULL,
    `purchase_price` DECIMAL(10, 2) NOT NULL,
    `min_order_qty` DECIMAL(10, 2) NULL,
    `lead_time_days` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `fabric_suppliers_fabric_id_idx`(`fabric_id`),
    INDEX `fabric_suppliers_supplier_id_idx`(`supplier_id`),
    UNIQUE INDEX `fabric_suppliers_fabric_id_supplier_id_key`(`fabric_id`, `supplier_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_name` VARCHAR(191) NOT NULL,
    `contact_name` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `wechat` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `addresses` JSON NULL,
    `credit_type` VARCHAR(191) NOT NULL DEFAULT 'prepay',
    `credit_days` INTEGER NULL,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customers_company_name_idx`(`company_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_pricing` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `fabric_id` INTEGER NOT NULL,
    `special_price` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customer_pricing_customer_id_idx`(`customer_id`),
    INDEX `customer_pricing_fabric_id_idx`(`fabric_id`),
    UNIQUE INDEX `customer_pricing_customer_id_fabric_id_key`(`customer_id`, `fabric_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_code` VARCHAR(191) NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'INQUIRY',
    `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `customer_paid` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `customer_pay_status` VARCHAR(191) NOT NULL DEFAULT 'unpaid',
    `customer_pay_method` VARCHAR(191) NULL,
    `customer_credit_days` INTEGER NULL,
    `customer_paid_at` DATETIME(3) NULL,
    `delivery_address` TEXT NULL,
    `created_by` INTEGER NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_order_code_key`(`order_code`),
    INDEX `orders_order_code_idx`(`order_code`),
    INDEX `orders_customer_id_idx`(`customer_id`),
    INDEX `orders_status_idx`(`status`),
    INDEX `orders_customer_pay_status_idx`(`customer_pay_status`),
    INDEX `orders_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `fabric_id` INTEGER NOT NULL,
    `supplier_id` INTEGER NULL,
    `quote_id` INTEGER NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `sale_price` DECIMAL(10, 2) NOT NULL,
    `purchase_price` DECIMAL(10, 2) NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'INQUIRY',
    `prev_status` VARCHAR(191) NULL,
    `delivery_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `order_items_order_id_idx`(`order_id`),
    INDEX `order_items_fabric_id_idx`(`fabric_id`),
    INDEX `order_items_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_timelines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_item_id` INTEGER NOT NULL,
    `from_status` VARCHAR(191) NULL,
    `to_status` VARCHAR(191) NOT NULL,
    `operator_id` INTEGER NULL,
    `remark` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_timelines_order_item_id_idx`(`order_item_id`),
    INDEX `order_timelines_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quote_code` VARCHAR(191) NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `fabric_id` INTEGER NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `total_price` DECIMAL(12, 2) NOT NULL,
    `valid_until` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `quotes_quote_code_key`(`quote_code`),
    INDEX `quotes_quote_code_idx`(`quote_code`),
    INDEX `quotes_customer_id_idx`(`customer_id`),
    INDEX `quotes_fabric_id_idx`(`fabric_id`),
    INDEX `quotes_valid_until_idx`(`valid_until`),
    INDEX `quotes_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `logistics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_item_id` INTEGER NOT NULL,
    `carrier` VARCHAR(191) NOT NULL,
    `contact_name` VARCHAR(191) NULL,
    `contact_phone` VARCHAR(191) NULL,
    `tracking_no` VARCHAR(191) NULL,
    `shipped_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `logistics_order_item_id_idx`(`order_item_id`),
    INDEX `logistics_tracking_no_idx`(`tracking_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `supplier_id` INTEGER NOT NULL,
    `payable` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `paid` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `pay_status` VARCHAR(191) NOT NULL DEFAULT 'unpaid',
    `pay_method` VARCHAR(191) NULL,
    `credit_days` INTEGER NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `supplier_payments_order_id_idx`(`order_id`),
    INDEX `supplier_payments_supplier_id_idx`(`supplier_id`),
    INDEX `supplier_payments_pay_status_idx`(`pay_status`),
    UNIQUE INDEX `supplier_payments_order_id_supplier_id_key`(`order_id`, `supplier_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `supplier_id` INTEGER NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `pay_method` VARCHAR(191) NULL,
    `remark` TEXT NULL,
    `operator_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payment_records_order_id_idx`(`order_id`),
    INDEX `payment_records_supplier_id_idx`(`supplier_id`),
    INDEX `payment_records_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `fabric_images` ADD CONSTRAINT `fabric_images_fabric_id_fkey` FOREIGN KEY (`fabric_id`) REFERENCES `fabrics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fabric_suppliers` ADD CONSTRAINT `fabric_suppliers_fabric_id_fkey` FOREIGN KEY (`fabric_id`) REFERENCES `fabrics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fabric_suppliers` ADD CONSTRAINT `fabric_suppliers_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_pricing` ADD CONSTRAINT `customer_pricing_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_pricing` ADD CONSTRAINT `customer_pricing_fabric_id_fkey` FOREIGN KEY (`fabric_id`) REFERENCES `fabrics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_fabric_id_fkey` FOREIGN KEY (`fabric_id`) REFERENCES `fabrics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_quote_id_fkey` FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_timelines` ADD CONSTRAINT `order_timelines_order_item_id_fkey` FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_timelines` ADD CONSTRAINT `order_timelines_operator_id_fkey` FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_fabric_id_fkey` FOREIGN KEY (`fabric_id`) REFERENCES `fabrics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `logistics` ADD CONSTRAINT `logistics_order_item_id_fkey` FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_payments` ADD CONSTRAINT `supplier_payments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_payments` ADD CONSTRAINT `supplier_payments_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_records` ADD CONSTRAINT `payment_records_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_records` ADD CONSTRAINT `payment_records_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_records` ADD CONSTRAINT `payment_records_operator_id_fkey` FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
