"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleCurrencyUpdate = scheduleCurrencyUpdate;
exports.updateCurrenciesOnStartup = updateCurrenciesOnStartup;
const node_cron_1 = __importDefault(require("node-cron"));
const currency_service_1 = require("../services/currency.service");
const prisma_1 = require("../utils/prisma");
// Actualizează cursurile valutare zilnic la ora 10:00
function scheduleCurrencyUpdate() {
    // Rulează în fiecare zi la 10:00 AM
    node_cron_1.default.schedule('0 10 * * *', async () => {
        console.log('🔄 Actualizare automată cursuri valutare...');
        // Încearcă mai întâi de la BNR (pentru RON)
        const bnrResult = await currency_service_1.currencyService.updateRatesFromBNR();
        if (bnrResult.success) {
            console.log('✅ Cursuri BNR actualizate:', bnrResult.rates.length, 'monede');
        }
        // Apoi actualizează de la API extern pentru alte monede
        const apiResult = await currency_service_1.currencyService.updateRatesFromAPI();
        if (apiResult.success) {
            console.log('✅ Cursuri API actualizate:', apiResult.rates.length, 'monede');
        }
    });
    console.log('⏰ Job actualizare cursuri valutare programat (zilnic la 10:00)');
}
// Actualizează cursurile la pornirea serverului (cu verificare DB)
async function updateCurrenciesOnStartup() {
    console.log('🔄 Actualizare inițială cursuri valutare...');
    // Verifică conexiunea la DB înainte de actualizare
    const dbConnected = await (0, prisma_1.verifyDatabaseConnection)();
    if (!dbConnected) {
        console.error('❌ Nu se poate actualiza cursurile - baza de date nu este disponibilă');
        return;
    }
    // Așteaptă 2 secunde pentru ca DB să fie complet gata
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Încearcă actualizarea BNR
    const bnrResult = await currency_service_1.currencyService.updateRatesFromBNR();
    if (bnrResult.success) {
        console.log('✅ Cursuri BNR actualizate la pornire:', bnrResult.rates.length, 'monede');
    }
    // Încearcă actualizarea API
    const apiResult = await currency_service_1.currencyService.updateRatesFromAPI();
    if (apiResult.success) {
        console.log('✅ Cursuri API actualizate la pornire:', apiResult.rates.length, 'monede');
    }
}
