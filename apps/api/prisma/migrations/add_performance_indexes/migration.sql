-- Migration: Add Performance Indexes
-- Description: Adds composite and partial indexes for query optimization

-- AbandonedCart indexes
CREATE INDEX IF NOT EXISTS "abandoned_carts_recovered_createdAt_idx" ON "abandoned_carts"("recovered", "createdAt");
CREATE INDEX IF NOT EXISTS "abandoned_carts_userId_recovered_createdAt_idx" ON "abandoned_carts"("userId", "recovered", "createdAt");

-- Order indexes
CREATE INDEX IF NOT EXISTS "orders_status_paymentStatus_idx" ON "orders"("status", "paymentStatus");
CREATE INDEX IF NOT EXISTS "orders_paymentStatus_createdAt_idx" ON "orders"("paymentStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_userId_createdAt_idx" ON "orders"("userId", "createdAt");

-- Cart indexes
CREATE INDEX IF NOT EXISTS "carts_updatedAt_idx" ON "carts"("updatedAt");

-- ProductVariant indexes
CREATE INDEX IF NOT EXISTS "product_variants_productId_isActive_price_idx" ON "product_variants"("productId", "isActive", "price");
CREATE INDEX IF NOT EXISTS "product_variants_stock_idx" ON "product_variants"("stock");

-- Analyze tables after index creation
ANALYZE "abandoned_carts";
ANALYZE "orders";
ANALYZE "carts";
ANALYZE "product_variants";

