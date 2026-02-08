import cron from 'node-cron';
import { currencyService } from '../services/currency.service';

// Actualizează cursurile valutare zilnic la ora 10:00
export function scheduleCurrencyUpdate() {
  // Rulează în fiecare zi la 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('🔄 Actualizare automată cursuri valutare...');
    
    try {
      // Încearcă mai întâi de la BNR (pentru RON)
      const bnrResult = await currencyService.updateRatesFromBNR();
      console.log('✅ Cursuri BNR actualizate:', bnrResult.rates.length, 'monede');
    } catch (error) {
      console.error('❌ Eroare actualizare BNR:', error);
    }

    try {
      // Apoi actualizează de la API extern pentru alte monede
      const apiResult = await currencyService.updateRatesFromAPI();
      console.log('✅ Cursuri API actualizate:', apiResult.rates.length, 'monede');
    } catch (error) {
      console.error('❌ Eroare actualizare API:', error);
    }
  });

  console.log('⏰ Job actualizare cursuri valutare programat (zilnic la 10:00)');
}

// Actualizează cursurile la pornirea serverului
export async function updateCurrenciesOnStartup() {
  console.log('🔄 Actualizare inițială cursuri valutare...');
  
  try {
    await currencyService.updateRatesFromBNR();
    console.log('✅ Cursuri BNR actualizate la pornire');
  } catch (error) {
    console.error('❌ Eroare actualizare BNR la pornire:', error);
  }

  try {
    await currencyService.updateRatesFromAPI();
    console.log('✅ Cursuri API actualizate la pornire');
  } catch (error) {
    console.error('❌ Eroare actualizare API la pornire:', error);
  }
}
