-- Step 1: Add deletedAt column to all 6 tables
ALTER TABLE `users` ADD COLUMN `deleted_at` DATETIME(3) NULL DEFAULT NULL;
ALTER TABLE `fabrics` ADD COLUMN `deleted_at` DATETIME(3) NULL DEFAULT NULL;
ALTER TABLE `suppliers` ADD COLUMN `deleted_at` DATETIME(3) NULL DEFAULT NULL;
ALTER TABLE `customers` ADD COLUMN `deleted_at` DATETIME(3) NULL DEFAULT NULL;
ALTER TABLE `products` ADD COLUMN `deleted_at` DATETIME(3) NULL DEFAULT NULL;
ALTER TABLE `product_bundles` ADD COLUMN `deleted_at` DATETIME(3) NULL DEFAULT NULL;

-- Step 2: Migrate existing soft-deleted records (isActive=false -> deletedAt=NOW)
UPDATE `users` SET `deleted_at` = NOW(3) WHERE `is_active` = false;
UPDATE `fabrics` SET `deleted_at` = NOW(3) WHERE `is_active` = false;
UPDATE `suppliers` SET `deleted_at` = NOW(3) WHERE `is_active` = false;
UPDATE `customers` SET `deleted_at` = NOW(3) WHERE `is_active` = false;
UPDATE `products` SET `deleted_at` = NOW(3) WHERE `is_active` = false;
UPDATE `product_bundles` SET `deleted_at` = NOW(3) WHERE `is_active` = false;

-- Step 3: Add generated columns for unique constraint compatibility (MySQL NULL != NULL pattern)
-- Fabric: fabricCode must be unique among non-deleted records
ALTER TABLE `fabrics` ADD COLUMN `unarchived` BOOLEAN GENERATED ALWAYS AS (IF(`deleted_at` IS NULL, 1, NULL)) VIRTUAL;
DROP INDEX `fabrics_fabric_code_key` ON `fabrics`;
CREATE UNIQUE INDEX `fabrics_fabric_code_unarchived_key` ON `fabrics`(`fabric_code`, `unarchived`);

-- Supplier: companyName must be unique among non-deleted records
ALTER TABLE `suppliers` ADD COLUMN `unarchived` BOOLEAN GENERATED ALWAYS AS (IF(`deleted_at` IS NULL, 1, NULL)) VIRTUAL;
DROP INDEX `suppliers_company_name_key` ON `suppliers`;
CREATE UNIQUE INDEX `suppliers_company_name_unarchived_key` ON `suppliers`(`company_name`, `unarchived`);

-- Product: productCode must be unique among non-deleted records
ALTER TABLE `products` ADD COLUMN `unarchived` BOOLEAN GENERATED ALWAYS AS (IF(`deleted_at` IS NULL, 1, NULL)) VIRTUAL;
DROP INDEX `products_product_code_key` ON `products`;
CREATE UNIQUE INDEX `products_product_code_unarchived_key` ON `products`(`product_code`, `unarchived`);

-- ProductBundle: bundleCode must be unique among non-deleted records
ALTER TABLE `product_bundles` ADD COLUMN `unarchived` BOOLEAN GENERATED ALWAYS AS (IF(`deleted_at` IS NULL, 1, NULL)) VIRTUAL;
DROP INDEX `product_bundles_bundle_code_key` ON `product_bundles`;
CREATE UNIQUE INDEX `product_bundles_bundle_code_unarchived_key` ON `product_bundles`(`bundle_code`, `unarchived`);

-- Step 4: Add indexes on deleted_at for filtering performance
CREATE INDEX `users_deleted_at_idx` ON `users`(`deleted_at`);
CREATE INDEX `fabrics_deleted_at_idx` ON `fabrics`(`deleted_at`);
CREATE INDEX `suppliers_deleted_at_idx` ON `suppliers`(`deleted_at`);
CREATE INDEX `customers_deleted_at_idx` ON `customers`(`deleted_at`);
CREATE INDEX `products_deleted_at_idx` ON `products`(`deleted_at`);
CREATE INDEX `product_bundles_deleted_at_idx` ON `product_bundles`(`deleted_at`);

-- Step 5: Drop isActive columns (AFTER data migration and new indexes)
ALTER TABLE `users` DROP COLUMN `is_active`;
ALTER TABLE `fabrics` DROP COLUMN `is_active`;
ALTER TABLE `suppliers` DROP COLUMN `is_active`;
ALTER TABLE `customers` DROP COLUMN `is_active`;
ALTER TABLE `products` DROP COLUMN `is_active`;
ALTER TABLE `product_bundles` DROP COLUMN `is_active`;
