import cron from 'node-cron';
import { currencyService } from '../services/currency.service';
import { verifyDatabaseConnection } from '../utils/prisma';

// Actualizează cursurile valutare zilnic la ora 10:00
export function scheduleCurrencyUpdate() {
  // Rulează în fiecare zi la 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('🔄 Actualizare automată cursuri valutare...');
    
    // Încearcă mai întâi de la BNR (pentru RON)
    const bnrResult = await currencyService.updateRatesFromBNR();
    if (bnrResult.success) {
      console.log('✅ Cursuri BNR actualizate:', bnrResult.rates.length, 'monede');
    }

    // Apoi actualizează de la API extern pentru alte monede
    const apiResult = await currencyService.updateRatesFromAPI();
    if (apiResult.success) {
      console.log('✅ Cursuri API actualizate:', apiResult.rates.length, 'monede');
    }
  });

  console.log('⏰ Job actualizare cursuri valutare programat (zilnic la 10:00)');
}

// Actualizează cursurile la pornirea serverului (cu verificare DB)
export async function updateCurrenciesOnStartup() {
  console.log('🔄 Actualizare inițială cursuri valutare...');
  
  // Verifică conexiunea la DB înainte de actualizare
  const dbConnected = await verifyDatabaseConnection();
  if (!dbConnected) {
    console.error('❌ Nu se poate actualiza cursurile - baza de date nu este disponibilă');
    return;
  }

  // Așteaptă 2 secunde pentru ca DB să fie complet gata
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Încearcă actualizarea BNR
  const bnrResult = await currencyService.updateRatesFromBNR();
  if (bnrResult.success) {
    console.log('✅ Cursuri BNR actualizate la pornire:', bnrResult.rates.length, 'monede');
  }

  // Încearcă actualizarea API
  const apiResult = await currencyService.updateRatesFromAPI();
  if (apiResult.success) {
    console.log('✅ Cursuri API actualizate la pornire:', apiResult.rates.length, 'monede');
  }
}
