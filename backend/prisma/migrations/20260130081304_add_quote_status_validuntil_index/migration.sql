-- CreateIndex
CREATE INDEX `idx_quotes_status_valid_until` ON `quotes`(`status`, `valid_until`);
