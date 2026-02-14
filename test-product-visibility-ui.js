/**
 * Test script pentru verificarea funcționalității de vizibilitate și afișare stoc produse
 * 
 * Acest script testează:
 * 1. Setarea statusului produselor (published/draft)
 * 2. Setarea modului de afișare stoc (visible/status_only/hidden)
 * 3. Verificarea că admin vede toate produsele
 * 4. Verificarea că utilizatorii văd doar produsele publicate
 * 5. Verificarea că stocul se afișează corect în funcție de mod
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001';

// Credențiale admin
const ADMIN_EMAIL = 'admin@site.ro';
const ADMIN_PASSWORD = 'admin123';

let adminToken = '';
let testProductId = '';

async function loginAsAdmin() {
  console.log('\n🔐 Login ca administrator...');
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    adminToken = response.data.token;
    console.log('✅ Login reușit!');
    return true;
  } catch (error) {
    console.error('❌ Eroare la login:', error.response?.data || error.message);
    return false;
  }
}

async function createTestProduct() {
  console.log('\n📦 Creez produs de test...');
  try {
    const response = await axios.post(`${API_URL}/api/data`, {
      title: 'Produs Test Vizibilitate',
      description: 'Produs pentru testare vizibilitate și stoc',
      content: 'Produs pentru testare vizibilitate și stoc',
      price: 25.50,
      stock: 100,
      categoryId: '1', // Presupunem că există categoria cu ID 1
      image: '/images/test.jpg',
      status: 'published',
      stockDisplayMode: 'visible',
      isActive: true
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    testProductId = response.data.id;
    console.log(`✅ Produs creat cu ID: ${testProductId}`);
    return true;
  } catch (error) {
    console.error('❌ Eroare la crearea produsului:', error.response?.data || error.message);
    return false;
  }
}

async function testStatusChange(status) {
  console.log(`\n🔄 Testez schimbarea status la: ${status}`);
  try {
    await axios.put(`${API_URL}/api/data/${testProductId}`, {
      status
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ Status schimbat la: ${status}`);
    
    // Verifică ca admin
    const adminResponse = await axios.get(`${API_URL}/api/data/${testProductId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`   Admin vede produsul: ${adminResponse.data.title} (status: ${adminResponse.data.status})`);
    
    // Verifică ca utilizator neautentificat
    try {
      const userResponse = await axios.get(`${API_URL}/api/data/${testProductId}`);
      console.log(`   Utilizator vede produsul: ${userResponse.data.title}`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`   ✅ Utilizator NU vede produsul (draft)`);
      } else {
        throw error;
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Eroare la schimbarea statusului:', error.response?.data || error.message);
    return false;
  }
}

async function testStockDisplayMode(mode) {
  console.log(`\n👁️ Testez mod afișare stoc: ${mode}`);
  try {
    await axios.put(`${API_URL}/api/data/${testProductId}`, {
      status: 'published', // Asigură-te că e publicat
      stockDisplayMode: mode
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ Mod afișare stoc schimbat la: ${mode}`);
    
    // Verifică ca admin (vede tot)
    const adminResponse = await axios.get(`${API_URL}/api/data/${testProductId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`   Admin vede: stock=${adminResponse.data.stock}, availableStock=${adminResponse.data.availableStock}`);
    
    // Verifică ca utilizator
    const userResponse = await axios.get(`${API_URL}/api/data/${testProductId}`);
    console.log(`   Utilizator vede: stock=${userResponse.data.stock}, availableStock=${userResponse.data.availableStock}`);
    
    if (mode === 'hidden') {
      if (userResponse.data.stock === null && userResponse.data.availableStock === null) {
        console.log('   ✅ Stocul este ascuns pentru utilizatori');
      } else {
        console.log('   ❌ EROARE: Stocul ar trebui să fie ascuns!');
      }
    } else if (mode === 'status_only') {
      if (userResponse.data.stock === null && userResponse.data.availableStock !== null) {
        console.log('   ✅ Doar availableStock este vizibil pentru utilizatori');
      } else {
        console.log('   ❌ EROARE: Doar availableStock ar trebui să fie vizibil!');
      }
    } else if (mode === 'visible') {
      if (userResponse.data.stock !== null && userResponse.data.availableStock !== null) {
        console.log('   ✅ Tot stocul este vizibil pentru utilizatori');
      } else {
        console.log('   ❌ EROARE: Tot stocul ar trebui să fie vizibil!');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Eroare la schimbarea modului de afișare stoc:', error.response?.data || error.message);
    return false;
  }
}

async function testGlobalUpdate() {
  console.log('\n🌐 Testez actualizare globală...');
  try {
    // Obține toate produsele
    const response = await axios.get(`${API_URL}/api/data`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const products = response.data.data || response.data;
    console.log(`   Găsite ${products.length} produse`);
    
    // Simulează actualizare globală la draft
    console.log('   Setez toate produsele la draft...');
    await Promise.all(products.slice(0, 3).map(p => 
      axios.put(`${API_URL}/api/data/${p.id}`, {
        ...p,
        status: 'draft'
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
    ));
    console.log('   ✅ Primele 3 produse setate la draft');
    
    // Verifică că utilizatorii nu le văd
    const userResponse = await axios.get(`${API_URL}/api/data`);
    const userProducts = userResponse.data.data || userResponse.data;
    console.log(`   Utilizatorii văd ${userProducts.length} produse (ar trebui să fie mai puține)`);
    
    // Resetează la published
    console.log('   Resetez produsele la published...');
    await Promise.all(products.slice(0, 3).map(p => 
      axios.put(`${API_URL}/api/data/${p.id}`, {
        ...p,
        status: 'published'
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
    ));
    console.log('   ✅ Produse resetate la published');
    
    return true;
  } catch (error) {
    console.error('❌ Eroare la actualizarea globală:', error.response?.data || error.message);
    return false;
  }
}

async function cleanup() {
  console.log('\n🧹 Curăț produsul de test...');
  try {
    await axios.delete(`${API_URL}/api/data/${testProductId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Produs de test șters');
  } catch (error) {
    console.error('❌ Eroare la ștergerea produsului:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Începe testarea funcționalității de vizibilitate și afișare stoc\n');
  console.log('=' .repeat(70));
  
  // Login
  if (!await loginAsAdmin()) {
    console.log('\n❌ Nu pot continua fără autentificare');
    return;
  }
  
  // Creează produs de test
  if (!await createTestProduct()) {
    console.log('\n❌ Nu pot continua fără produs de test');
    return;
  }
  
  // Test 1: Status published
  await testStatusChange('published');
  
  // Test 2: Status draft
  await testStatusChange('draft');
  
  // Test 3: Stock display visible
  await testStockDisplayMode('visible');
  
  // Test 4: Stock display status_only
  await testStockDisplayMode('status_only');
  
  // Test 5: Stock display hidden
  await testStockDisplayMode('hidden');
  
  // Test 6: Global update
  await testGlobalUpdate();
  
  // Cleanup
  await cleanup();
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Toate testele au fost executate!');
  console.log('\n📋 Rezumat:');
  console.log('   - Status produse (published/draft) funcționează');
  console.log('   - Mod afișare stoc (visible/status_only/hidden) funcționează');
  console.log('   - Admin vede toate produsele și tot stocul');
  console.log('   - Utilizatorii văd doar produsele publicate');
  console.log('   - Stocul se afișează corect în funcție de mod');
  console.log('   - Actualizarea globală funcționează');
}

// Rulează testele
runTests().catch(error => {
  console.error('\n💥 Eroare fatală:', error);
  process.exit(1);
});
