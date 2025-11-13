-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoiceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "chainId" INTEGER NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "forUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "txHash" TEXT,
    "payerAddress" TEXT,
    "metaJson" JSONB,
    "confirmations" INTEGER,
    "confirmedAt" DATETIME,
    "lastCheckedAt" DATETIME,
    "verifyRetries" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Invoice_forUserId_fkey" FOREIGN KEY ("forUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("amount", "chainId", "createdAt", "expiresAt", "forUserId", "id", "invoiceId", "metaJson", "payerAddress", "status", "toAddress", "tokenAddress", "tokenSymbol", "txHash") SELECT "amount", "chainId", "createdAt", "expiresAt", "forUserId", "id", "invoiceId", "metaJson", "payerAddress", "status", "toAddress", "tokenAddress", "tokenSymbol", "txHash" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceId_key" ON "Invoice"("invoiceId");
CREATE UNIQUE INDEX "Invoice_txHash_key" ON "Invoice"("txHash");
CREATE INDEX "Invoice_status_chainId_idx" ON "Invoice"("status", "chainId");
CREATE INDEX "Invoice_status_lastCheckedAt_idx" ON "Invoice"("status", "lastCheckedAt");
CREATE INDEX "Invoice_status_verifyRetries_idx" ON "Invoice"("status", "verifyRetries");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
