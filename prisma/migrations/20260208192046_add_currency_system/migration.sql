-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" TEXT NOT NULL DEFAULT 'before',
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "fromCurrencyId" TEXT NOT NULL,
    "toCurrencyId" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRateHistory" (
    "id" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "Currency"("code");

-- CreateIndex
CREATE INDEX "Currency_code_idx" ON "Currency"("code");

-- CreateIndex
CREATE INDEX "Currency_isBase_idx" ON "Currency"("isBase");

-- CreateIndex
CREATE INDEX "Currency_isActive_idx" ON "Currency"("isActive");

-- CreateIndex
CREATE INDEX "ExchangeRate_fromCurrencyId_idx" ON "ExchangeRate"("fromCurrencyId");

-- CreateIndex
CREATE INDEX "ExchangeRate_toCurrencyId_idx" ON "ExchangeRate"("toCurrencyId");

-- CreateIndex
CREATE INDEX "ExchangeRate_lastUpdated_idx" ON "ExchangeRate"("lastUpdated");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_fromCurrencyId_toCurrencyId_key" ON "ExchangeRate"("fromCurrencyId", "toCurrencyId");

-- CreateIndex
CREATE INDEX "ExchangeRateHistory_fromCurrency_toCurrency_idx" ON "ExchangeRateHistory"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE INDEX "ExchangeRateHistory_recordedAt_idx" ON "ExchangeRateHistory"("recordedAt");

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_fromCurrencyId_fkey" FOREIGN KEY ("fromCurrencyId") REFERENCES "Currency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_toCurrencyId_fkey" FOREIGN KEY ("toCurrencyId") REFERENCES "Currency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
