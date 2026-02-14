const fetch = require('node-fetch');

async function testVouchersAPI() {
  try {
    console.log('🧪 Testez API-ul de vouchere...\n');
    
    const response = await fetch('http://localhost:3001/api/admin/vouchers', {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Trebuie să pui un token valid
      }
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const data = await response.json();
    console.log('\nDate primite:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\nTip date:', typeof data);
    console.log('Este array?', Array.isArray(data));
    
  } catch (error) {
    console.error('❌ Eroare:', error.message);
  }
}

testVouchersAPI();
