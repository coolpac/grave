-- CreateIndex
CREATE INDEX "cart_items_cartId_productId_idx" ON "cart_items"("cartId", "productId");

-- CreateIndex
CREATE INDEX "cart_items_cartId_productId_variantId_idx" ON "cart_items"("cartId", "productId", "variantId");

-- CreateIndex
CREATE INDEX "categories_isActive_order_idx" ON "categories"("isActive", "order");

-- CreateIndex
CREATE INDEX "categories_order_idx" ON "categories"("order");

-- CreateIndex
CREATE INDEX "order_items_orderId_productId_idx" ON "order_items"("orderId", "productId");

-- CreateIndex
CREATE INDEX "orders_userId_status_idx" ON "orders"("userId", "status");

-- CreateIndex
CREATE INDEX "orders_userId_status_createdAt_idx" ON "orders"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "product_variants_productId_isActive_idx" ON "product_variants"("productId", "isActive");

-- CreateIndex
CREATE INDEX "product_variants_isActive_idx" ON "product_variants"("isActive");

-- CreateIndex
CREATE INDEX "products_material_idx" ON "products"("material");

-- CreateIndex
CREATE INDEX "products_categoryId_isActive_idx" ON "products"("categoryId", "isActive");

-- CreateIndex
CREATE INDEX "products_categoryId_isActive_createdAt_idx" ON "products"("categoryId", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "products_material_isActive_idx" ON "products"("material", "isActive");

-- CreateIndex
CREATE INDEX "products_isActive_createdAt_idx" ON "products"("isActive", "createdAt");
