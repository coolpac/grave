-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_abandoned_carts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "cartId" INTEGER NOT NULL,
    "itemsCount" INTEGER NOT NULL,
    "totalAmount" REAL NOT NULL,
    "reminderSent" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" DATETIME,
    "recovered" BOOLEAN NOT NULL DEFAULT false,
    "recoveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "abandoned_carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "abandoned_carts_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_abandoned_carts" ("cartId", "createdAt", "id", "itemsCount", "lastReminderAt", "recovered", "recoveredAt", "reminderSent", "totalAmount", "updatedAt", "userId") SELECT "cartId", "createdAt", "id", "itemsCount", "lastReminderAt", "recovered", "recoveredAt", "reminderSent", "totalAmount", "updatedAt", "userId" FROM "abandoned_carts";
DROP TABLE "abandoned_carts";
ALTER TABLE "new_abandoned_carts" RENAME TO "abandoned_carts";
CREATE INDEX "abandoned_carts_userId_idx" ON "abandoned_carts"("userId");
CREATE INDEX "abandoned_carts_recovered_idx" ON "abandoned_carts"("recovered");
CREATE INDEX "abandoned_carts_createdAt_idx" ON "abandoned_carts"("createdAt");
CREATE UNIQUE INDEX "abandoned_carts_cartId_key" ON "abandoned_carts"("cartId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
