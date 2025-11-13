-- CreateTable
CREATE TABLE "Invoice" (
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
    CONSTRAINT "Invoice_forUserId_fkey" FOREIGN KEY ("forUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TokenWhitelist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chainId" INTEGER NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 18,
    "enabled" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceId_key" ON "Invoice"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_txHash_key" ON "Invoice"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "TokenWhitelist_chainId_tokenAddress_key" ON "TokenWhitelist"("chainId", "tokenAddress");
