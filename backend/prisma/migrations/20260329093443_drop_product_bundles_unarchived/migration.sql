-- Fix missing product_bundles cleanup from previous audit_log migration.
-- The soft_delete_migration added unarchived to product_bundles but the
-- audit_log migration only cleaned up fabrics, products, and suppliers.

-- Drop the composite unique index that depends on the unarchived column
DROP INDEX `product_bundles_bundle_code_unarchived_key` ON `product_bundles`;

-- Drop the orphaned generated column
ALTER TABLE `product_bundles` DROP COLUMN `unarchived`;
