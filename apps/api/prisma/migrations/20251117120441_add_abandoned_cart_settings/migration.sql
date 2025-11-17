-- CreateTable
CREATE TABLE "abandoned_cart_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "autoRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderIntervalHours" INTEGER NOT NULL DEFAULT 24,
    "maxReminders" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
