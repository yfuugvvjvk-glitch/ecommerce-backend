import { prisma } from '../utils/prisma';
import axios from 'axios';

interface CurrencyData {
  code: string;
  name: string;
  symbol: string;
  isBase?: boolean;
  isActive?: boolean;
  position?: 'before' | 'after';
  decimals?: number;
}

interface ExchangeRateData {
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rate: number;
  source?: string;
}

export class CurrencyService {
  // Obține toate monedele active
  async getAllCurrencies() {
    return await prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  // Obține moneda de bază
  async getBaseCurrency() {
    return await prisma.currency.findFirst({
      where: { isBase: true, isActive: true },
    });
  }

  // Creează o monedă nouă
  async createCurrency(data: CurrencyData) {
    // Dacă se setează ca monedă de bază, dezactivează celelalte
    if (data.isBase) {
      await prisma.currency.updateMany({
        where: { isBase: true },
        data: { isBase: false },
      });
    }

    return await prisma.currency.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        symbol: data.symbol,
        isBase: data.isBase || false,
        isActive: data.isActive !== false,
        position: data.position || 'before',
        decimals: data.decimals || 2,
      },
    });
  }

  // Actualizează o monedă
  async updateCurrency(id: string, data: Partial<CurrencyData>) {
    // Dacă se setează ca monedă de bază, dezactivează celelalte
    if (data.isBase) {
      await prisma.currency.updateMany({
        where: { isBase: true, NOT: { id } },
        data: { isBase: false },
      });
    }

    return await prisma.currency.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code.toUpperCase() }),
        ...(data.name && { name: data.name }),
        ...(data.symbol && { symbol: data.symbol }),
        ...(data.isBase !== undefined && { isBase: data.isBase }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.position && { position: data.position }),
        ...(data.decimals !== undefined && { decimals: data.decimals }),
      },
    });
  }

  // Șterge o monedă
  async deleteCurrency(id: string) {
    const currency = await prisma.currency.findUnique({ where: { id } });
    
    if (currency?.isBase) {
      throw new Error('Nu poți șterge moneda de bază');
    }

    // Șterge și cursurile de schimb asociate
    await prisma.exchangeRate.deleteMany({
      where: {
        OR: [
          { fromCurrencyId: id },
          { toCurrencyId: id },
        ],
      },
    });

    return await prisma.currency.delete({ where: { id } });
  }

  // Setează moneda de bază
  async setBaseCurrency(currencyId: string) {
    await prisma.currency.updateMany({
      where: { isBase: true },
      data: { isBase: false },
    });

    return await prisma.currency.update({
      where: { id: currencyId },
      data: { isBase: true, isActive: true },
    });
  }

  // Obține cursul de schimb între două monede
  async getExchangeRate(fromCode: string, toCode: string) {
    const fromCurrency = await prisma.currency.findUnique({
      where: { code: fromCode.toUpperCase() },
    });

    const toCurrency = await prisma.currency.findUnique({
      where: { code: toCode.toUpperCase() },
    });

    if (!fromCurrency || !toCurrency) {
      throw new Error('Monedă invalidă');
    }

    const rate = await prisma.exchangeRate.findUnique({
      where: {
        fromCurrencyId_toCurrencyId: {
          fromCurrencyId: fromCurrency.id,
          toCurrencyId: toCurrency.id,
        },
      },
      include: {
        fromCurrency: true,
        toCurrency: true,
      },
    });

    return rate;
  }

  // Actualizează sau creează un curs de schimb
  async upsertExchangeRate(data: ExchangeRateData) {
    const fromCurrency = await prisma.currency.findUnique({
      where: { code: data.fromCurrencyCode.toUpperCase() },
    });

    const toCurrency = await prisma.currency.findUnique({
      where: { code: data.toCurrencyCode.toUpperCase() },
    });

    if (!fromCurrency || !toCurrency) {
      throw new Error('Monedă invalidă');
    }

    // Salvează în istoric
    await prisma.exchangeRateHistory.create({
      data: {
        fromCurrency: fromCurrency.code,
        toCurrency: toCurrency.code,
        rate: data.rate,
        source: data.source || 'manual',
      },
    });

    return await prisma.exchangeRate.upsert({
      where: {
        fromCurrencyId_toCurrencyId: {
          fromCurrencyId: fromCurrency.id,
          toCurrencyId: toCurrency.id,
        },
      },
      update: {
        rate: data.rate,
        source: data.source || 'manual',
        lastUpdated: new Date(),
      },
      create: {
        fromCurrencyId: fromCurrency.id,
        toCurrencyId: toCurrency.id,
        rate: data.rate,
        source: data.source || 'manual',
      },
      include: {
        fromCurrency: true,
        toCurrency: true,
      },
    });
  }

  // Convertește o sumă între două monede
  async convertAmount(amount: number, fromCode: string, toCode: string) {
    if (fromCode === toCode) {
      return amount;
    }

    const rate = await this.getExchangeRate(fromCode, toCode);
    
    if (!rate) {
      throw new Error(`Nu există curs de schimb pentru ${fromCode} -> ${toCode}`);
    }

    return amount * rate.rate;
  }

  // Actualizează cursurile de la BNR (Banca Națională a României)
  async updateRatesFromBNR() {
    try {
      const response = await axios.get('https://www.bnr.ro/nbrfxrates.xml');
      const xml = response.data;
      
      // Parse XML simplu (pentru producție, folosește un parser XML)
      const rates: { [key: string]: number } = {};
      const rateMatches = xml.matchAll(/<Rate currency="([A-Z]{3})">([0-9.]+)<\/Rate>/g);
      
      for (const match of rateMatches) {
        const [, currency, rate] = match;
        rates[currency] = parseFloat(rate);
      }

      // RON este moneda de bază la BNR
      const ronCurrency = await prisma.currency.findUnique({
        where: { code: 'RON' },
      });

      if (!ronCurrency) {
        throw new Error('Moneda RON nu există în baza de date');
      }

      const updatedRates = [];

      // Actualizează cursurile pentru fiecare monedă
      for (const [currencyCode, rate] of Object.entries(rates)) {
        const currency = await prisma.currency.findUnique({
          where: { code: currencyCode },
        });

        if (currency && currency.isActive) {
          // RON -> Currency
          await this.upsertExchangeRate({
            fromCurrencyCode: 'RON',
            toCurrencyCode: currencyCode,
            rate: rate,
            source: 'bnr',
          });

          // Currency -> RON
          await this.upsertExchangeRate({
            fromCurrencyCode: currencyCode,
            toCurrencyCode: 'RON',
            rate: 1 / rate,
            source: 'bnr',
          });

          updatedRates.push({ currency: currencyCode, rate });
        }
      }

      return {
        success: true,
        updatedAt: new Date(),
        rates: updatedRates,
      };
    } catch (error) {
      console.error('Eroare la actualizarea cursurilor BNR:', error);
      throw new Error('Nu s-au putut actualiza cursurile de la BNR');
    }
  }

  // Actualizează cursurile de la un API extern (ex: exchangerate-api.com)
  async updateRatesFromAPI(apiKey?: string) {
    try {
      const baseCurrency = await this.getBaseCurrency();
      
      if (!baseCurrency) {
        throw new Error('Nu există monedă de bază setată');
      }

      // API gratuit pentru cursuri valutare
      const url = apiKey
        ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency.code}`
        : `https://api.exchangerate-api.com/v4/latest/${baseCurrency.code}`;

      const response = await axios.get(url);
      const rates = response.data.rates;

      const updatedRates = [];

      for (const [currencyCode, rate] of Object.entries(rates)) {
        const currency = await prisma.currency.findUnique({
          where: { code: currencyCode },
        });

        if (currency && currency.isActive && currencyCode !== baseCurrency.code) {
          await this.upsertExchangeRate({
            fromCurrencyCode: baseCurrency.code,
            toCurrencyCode: currencyCode,
            rate: rate as number,
            source: 'api',
          });

          // Inversul
          await this.upsertExchangeRate({
            fromCurrencyCode: currencyCode,
            toCurrencyCode: baseCurrency.code,
            rate: 1 / (rate as number),
            source: 'api',
          });

          updatedRates.push({ currency: currencyCode, rate });
        }
      }

      return {
        success: true,
        updatedAt: new Date(),
        baseCurrency: baseCurrency.code,
        rates: updatedRates,
      };
    } catch (error) {
      console.error('Eroare la actualizarea cursurilor din API:', error);
      throw new Error('Nu s-au putut actualiza cursurile valutare');
    }
  }

  // Obține toate cursurile de schimb
  async getAllExchangeRates() {
    return await prisma.exchangeRate.findMany({
      include: {
        fromCurrency: true,
        toCurrency: true,
      },
      orderBy: [
        { fromCurrency: { code: 'asc' } },
        { toCurrency: { code: 'asc' } },
      ],
    });
  }

  // Obține istoricul cursurilor
  async getExchangeRateHistory(fromCode: string, toCode: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await prisma.exchangeRateHistory.findMany({
      where: {
        fromCurrency: fromCode.toUpperCase(),
        toCurrency: toCode.toUpperCase(),
        recordedAt: { gte: startDate },
      },
      orderBy: { recordedAt: 'desc' },
    });
  }
}

export const currencyService = new CurrencyService();
