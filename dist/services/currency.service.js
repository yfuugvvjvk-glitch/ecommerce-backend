"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.currencyService = exports.CurrencyService = void 0;
const prisma_1 = require("../utils/prisma");
const axios_1 = __importDefault(require("axios"));
class CurrencyService {
    // Obține toate monedele active
    async getAllCurrencies() {
        return await prisma_1.prisma.currency.findMany({
            where: { isActive: true },
            orderBy: { code: 'asc' },
        });
    }
    // Obține moneda de bază
    async getBaseCurrency() {
        return await prisma_1.prisma.currency.findFirst({
            where: { isBase: true, isActive: true },
        });
    }
    // Creează o monedă nouă
    async createCurrency(data) {
        // Dacă se setează ca monedă de bază, dezactivează celelalte
        if (data.isBase) {
            await prisma_1.prisma.currency.updateMany({
                where: { isBase: true },
                data: { isBase: false },
            });
        }
        return await prisma_1.prisma.currency.create({
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
    async updateCurrency(id, data) {
        // Dacă se setează ca monedă de bază, dezactivează celelalte
        if (data.isBase) {
            await prisma_1.prisma.currency.updateMany({
                where: { isBase: true, NOT: { id } },
                data: { isBase: false },
            });
        }
        return await prisma_1.prisma.currency.update({
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
    async deleteCurrency(id) {
        const currency = await prisma_1.prisma.currency.findUnique({ where: { id } });
        if (currency?.isBase) {
            throw new Error('Nu poți șterge moneda de bază');
        }
        // Șterge și cursurile de schimb asociate
        await prisma_1.prisma.exchangeRate.deleteMany({
            where: {
                OR: [
                    { fromCurrencyId: id },
                    { toCurrencyId: id },
                ],
            },
        });
        return await prisma_1.prisma.currency.delete({ where: { id } });
    }
    // Setează moneda de bază
    async setBaseCurrency(currencyId) {
        await prisma_1.prisma.currency.updateMany({
            where: { isBase: true },
            data: { isBase: false },
        });
        return await prisma_1.prisma.currency.update({
            where: { id: currencyId },
            data: { isBase: true, isActive: true },
        });
    }
    // Obține cursul de schimb între două monede
    async getExchangeRate(fromCode, toCode) {
        const fromCurrency = await prisma_1.prisma.currency.findUnique({
            where: { code: fromCode.toUpperCase() },
        });
        const toCurrency = await prisma_1.prisma.currency.findUnique({
            where: { code: toCode.toUpperCase() },
        });
        if (!fromCurrency || !toCurrency) {
            throw new Error('Monedă invalidă');
        }
        const rate = await prisma_1.prisma.exchangeRate.findUnique({
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
    async upsertExchangeRate(data) {
        const fromCurrency = await prisma_1.prisma.currency.findUnique({
            where: { code: data.fromCurrencyCode.toUpperCase() },
        });
        const toCurrency = await prisma_1.prisma.currency.findUnique({
            where: { code: data.toCurrencyCode.toUpperCase() },
        });
        if (!fromCurrency || !toCurrency) {
            throw new Error('Monedă invalidă');
        }
        // Salvează în istoric
        await prisma_1.prisma.exchangeRateHistory.create({
            data: {
                fromCurrency: fromCurrency.code,
                toCurrency: toCurrency.code,
                rate: data.rate,
                source: data.source || 'manual',
            },
        });
        return await prisma_1.prisma.exchangeRate.upsert({
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
    async convertAmount(amount, fromCode, toCode) {
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
    async updateRatesFromBNR(retries = 3) {
        let lastError;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await axios_1.default.get('https://www.bnr.ro/nbrfxrates.xml', {
                    timeout: 10000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                const xml = response.data;
                // Parse XML simplu (pentru producție, folosește un parser XML)
                const rates = {};
                const rateMatches = xml.matchAll(/<Rate currency="([A-Z]{3})">([0-9.]+)<\/Rate>/g);
                for (const match of rateMatches) {
                    const [, currency, rate] = match;
                    rates[currency] = parseFloat(rate);
                }
                if (Object.keys(rates).length === 0) {
                    throw new Error('Nu s-au găsit cursuri valutare în răspunsul BNR');
                }
                // RON este moneda de bază la BNR
                const ronCurrency = await prisma_1.prisma.currency.findUnique({
                    where: { code: 'RON' },
                });
                if (!ronCurrency) {
                    console.warn('⚠️ Moneda RON nu există în baza de date - se sare actualizarea BNR');
                    return { success: false, updatedAt: new Date(), rates: [] };
                }
                const updatedRates = [];
                // Actualizează cursurile pentru fiecare monedă
                for (const [currencyCode, rate] of Object.entries(rates)) {
                    const currency = await prisma_1.prisma.currency.findUnique({
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
            }
            catch (error) {
                lastError = error;
                console.error(`❌ Tentativa ${attempt}/${retries} eșuată pentru BNR:`, error instanceof Error ? error.message : error);
                if (attempt < retries) {
                    const delay = attempt * 2000; // 2s, 4s, 6s
                    console.log(`⏳ Reîncerc în ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        console.error('❌ Toate tentativele de actualizare BNR au eșuat');
        return { success: false, updatedAt: new Date(), rates: [] };
    }
    // Actualizează cursurile de la un API extern (ex: exchangerate-api.com)
    async updateRatesFromAPI(apiKey, retries = 3) {
        let lastError;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const baseCurrency = await this.getBaseCurrency();
                if (!baseCurrency) {
                    console.warn('⚠️ Nu există monedă de bază setată - se sare actualizarea API');
                    return { success: false, updatedAt: new Date(), rates: [] };
                }
                // API gratuit pentru cursuri valutare
                const url = apiKey
                    ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency.code}`
                    : `https://api.exchangerate-api.com/v4/latest/${baseCurrency.code}`;
                const response = await axios_1.default.get(url, {
                    timeout: 10000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                const rates = response.data.rates;
                if (!rates || Object.keys(rates).length === 0) {
                    throw new Error('Nu s-au găsit cursuri valutare în răspunsul API');
                }
                const updatedRates = [];
                for (const [currencyCode, rate] of Object.entries(rates)) {
                    const currency = await prisma_1.prisma.currency.findUnique({
                        where: { code: currencyCode },
                    });
                    if (currency && currency.isActive && currencyCode !== baseCurrency.code) {
                        await this.upsertExchangeRate({
                            fromCurrencyCode: baseCurrency.code,
                            toCurrencyCode: currencyCode,
                            rate: rate,
                            source: 'api',
                        });
                        // Inversul
                        await this.upsertExchangeRate({
                            fromCurrencyCode: currencyCode,
                            toCurrencyCode: baseCurrency.code,
                            rate: 1 / rate,
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
            }
            catch (error) {
                lastError = error;
                console.error(`❌ Tentativa ${attempt}/${retries} eșuată pentru API:`, error instanceof Error ? error.message : error);
                if (attempt < retries) {
                    const delay = attempt * 2000; // 2s, 4s, 6s
                    console.log(`⏳ Reîncerc în ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        console.error('❌ Toate tentativele de actualizare API au eșuat');
        return { success: false, updatedAt: new Date(), rates: [] };
    }
    // Obține toate cursurile de schimb
    async getAllExchangeRates() {
        return await prisma_1.prisma.exchangeRate.findMany({
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
    async getExchangeRateHistory(fromCode, toCode, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        return await prisma_1.prisma.exchangeRateHistory.findMany({
            where: {
                fromCurrency: fromCode.toUpperCase(),
                toCurrency: toCode.toUpperCase(),
                recordedAt: { gte: startDate },
            },
            orderBy: { recordedAt: 'desc' },
        });
    }
}
exports.CurrencyService = CurrencyService;
exports.currencyService = new CurrencyService();
