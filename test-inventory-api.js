// Script de test pentru API-ul de inventory
const fetch = require('node-fetch');

async function testInventoryAPI() {
  try {
    // Înlocuiește cu ID-ul real al produsului "Lapte de capră"
    const productId = 'ID_PRODUS_AICI'; // Trebuie să găsim ID-ul real
    
    const response = await fetch(`http://localhost:3001/api/inventory/check/${productId}?quantity=1`);
    const data = await response.json();
    
    console.log('📦 Răspuns API inventory:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n✅ unitName returnat:', data.unitName);
    
  } catch (error) {
    console.error('❌ Eroare:', error.message);
  }
}

testInventoryAPI();
