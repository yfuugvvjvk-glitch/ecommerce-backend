const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initializeCurrencies() {
  console.log('🔄 Inițializare monede...');

  try {
    // Monede principale și populare
    const currencies = [
      {
        code: 'RON',
        name: 'Leu românesc',
        symbol: 'lei',
        isBase: true,
        isActive: true,
        position: 'after',
        decimals: 2,
      },
      {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        isBase: false,
        isActive: true,
        position: 'before',
        decimals: 2,
      },
      {
        code: 'USD',
        name: 'Dolar american',
        symbol: '$',
        isBase: false,
        isActive: true,
        position: 'before',
        decimals: 2,
      },
      {
        code: 'GBP',
        name: 'Liră sterlină',
        symbol: '£',
        isBase: false,
        isActive: true,
        position: 'before',
        decimals: 2,
      },
      {
        code: 'CHF',
        name: 'Franc elvețian',
        symbol: 'CHF',
        isBase: false,
        isActive: true,
        position: 'before',
        decimals: 2,
      },
      {
        code: 'JPY',
        name: 'Yen japonez',
        symbol: '¥',
        isBase: false,
        isActive: true,
        position: 'before',
        decimals: 0,
      },
      {
        code: 'CAD',
        name: 'Dolar canadian',
        symbol: 'C$',
        isBase: false,
        isActive: true,
        position: 'before',
        decimals: 2,
      },
      {
        code: 'AUD',
        name: 'Dolar australian',
        symbol: 'A$',
        isBase: false,
        isActive: true,
        position: 'before',
        decimals: 2,
      },
      {
        code: 'CNY',
        name: 'Yuan chinezesc',
        symbol: '¥',
        isBase: false,
        isActive: true,
        position: 'before',
        decimals: 2,
      },
      {
        code: 'SEK',
        name: 'Coroană suedeză',
        symbol: 'kr',
        isBase: false,
        isActive: true,
        position: 'after',
        decimals: 2,
      },
      {
        code: 'NOK',
        name: 'Coroană norvegiană',
        symbol: 'kr',
        isBase: false,
        isActive: true,
        position: 'after',
        decimals: 2,
      },
      {
        code: 'DKK',
        name: 'Coroană daneză',
        symbol: 'kr',
        isBase: false,
        isActive: true,
        position: 'after',
        decimals: 2,
      },
      {
        code: 'PLN',
        name: 'Zlot polonez',
        symbol: 'zł',
        isBase: false,
        isActive: true,
        position: 'after',
        decimals: 2,
      },
      {
        code: 'CZK',
        name: 'Coroană cehă',
        symbol: 'Kč',
        isBase: false,
        isActive: true,
        position: 'after',
        decimals: 2,
      },
      {
        code: 'HUF',
        name: 'Forint maghiar',
        symbol: 'Ft',
        isBase: false,
        isActive: true,
        position: 'after',
        decimals: 0,
      },
    ];

    for (const currency of currencies) {
      const existing = await prisma.currency.findUnique({
        where: { code: currency.code },
      });

      if (existing) {
        console.log(`✓ Moneda ${currency.code} există deja`);
        continue;
      }

      await prisma.currency.create({
        data: currency,
      });

      console.log(`✅ Moneda ${currency.code} (${currency.name}) a fost adăugată`);
    }

    // Cursuri inițiale (aproximative - vor fi actualizate automat)
    const exchangeRates = [
      { from: 'RON', to: 'EUR', rate: 0.20 },
      { from: 'EUR', to: 'RON', rate: 5.0 },
      { from: 'RON', to: 'USD', rate: 0.22 },
      { from: 'USD', to: 'RON', rate: 4.5 },
      { from: 'RON', to: 'GBP', rate: 0.17 },
      { from: 'GBP', to: 'RON', rate: 5.8 },
      { from: 'EUR', to: 'USD', rate: 1.1 },
      { from: 'USD', to: 'EUR', rate: 0.91 },
      { from: 'EUR', to: 'GBP', rate: 0.85 },
      { from: 'GBP', to: 'EUR', rate: 1.18 },
      { from: 'USD', to: 'GBP', rate: 0.77 },
      { from: 'GBP', to: 'USD', rate: 1.30 },
    ];

    console.log('\n🔄 Adăugare cursuri de schimb inițiale...');

    for (const rate of exchangeRates) {
      const fromCurrency = await prisma.currency.findUnique({
        where: { code: rate.from },
      });

      const toCurrency = await prisma.currency.findUnique({
        where: { code: rate.to },
      });

      if (!fromCurrency || !toCurrency) {
        console.log(`⚠️  Monedă lipsă pentru ${rate.from} -> ${rate.to}`);
        continue;
      }

      const existing = await prisma.exchangeRate.findUnique({
        where: {
          fromCurrencyId_toCurrencyId: {
            fromCurrencyId: fromCurrency.id,
            toCurrencyId: toCurrency.id,
          },
        },
      });

      if (existing) {
        console.log(`✓ Curs ${rate.from} -> ${rate.to} există deja`);
        continue;
      }

      await prisma.exchangeRate.create({
        data: {
          fromCurrencyId: fromCurrency.id,
          toCurrencyId: toCurrency.id,
          rate: rate.rate,
          source: 'manual',
        },
      });

      console.log(`✅ Curs ${rate.from} -> ${rate.to}: ${rate.rate}`);
    }

    console.log('\n✅ Inițializare monede completă!');
    console.log('💡 Cursurile vor fi actualizate automat zilnic la ora 10:00');
    console.log('💡 Poți actualiza manual cursurile din panoul de admin');
  } catch (error) {
    console.error('❌ Eroare la inițializare:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initializeCurrencies()
  .then(() => {
    console.log('\n🎉 Gata!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Eroare:', error);
    process.exit(1);
  });
