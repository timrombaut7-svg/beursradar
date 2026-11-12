-- CreateTable
CREATE TABLE "GameTrade" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "priceEur" DOUBLE PRECISION NOT NULL,
    "feeEur" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotTrade" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "priceEur" DOUBLE PRECISION NOT NULL,
    "feeEur" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "pnlEur" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotPosition" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "entryPriceEur" DOUBLE PRECISION NOT NULL,
    "stopLossEur" DOUBLE PRECISION NOT NULL,
    "target1Eur" DOUBLE PRECISION NOT NULL,
    "target2Eur" DOUBLE PRECISION NOT NULL,
    "partialTaken" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotEquity" (
    "id" TEXT NOT NULL,
    "equityEur" DOUBLE PRECISION NOT NULL,
    "cashEur" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotEquity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameTrade_profileId_createdAt_idx" ON "GameTrade"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "BotTrade_createdAt_idx" ON "BotTrade"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BotPosition_symbol_type_key" ON "BotPosition"("symbol", "type");

-- CreateIndex
CREATE INDEX "BotEquity_createdAt_idx" ON "BotEquity"("createdAt");

-- AddForeignKey
ALTER TABLE "GameTrade" ADD CONSTRAINT "GameTrade_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
