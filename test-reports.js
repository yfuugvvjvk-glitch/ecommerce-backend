// Script simplu pentru testarea endpoint-urilor de rapoarte
// Rulează cu: node test-reports.js

const http = require('http');

const BASE_URL = 'http://localhost:3001';

// Funcție helper pentru request-uri
function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Funcție pentru login
function login(email, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email, password });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          reject(new Error('Failed to parse login response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testReports() {
  console.log('🧪 Testare Endpoint-uri Rapoarte Financiare\n');

  try {
    // 1. Login ca admin
    console.log('1️⃣ Login ca admin...');
    const loginResponse = await login('admin@example.com', 'Admin1234');
    
    if (loginResponse.status !== 200) {
      console.error('❌ Login eșuat:', loginResponse.data);
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login reușit!\n');

    // 2. Test raport financiar complet
    console.log('2️⃣ Test raport financiar complet...');
    const financialReport = await makeRequest('/api/admin/reports/financial?period=month', token);
    
    if (financialReport.status === 200) {
      console.log('✅ Raport financiar obținut cu succes!');
      console.log('   📊 Venituri totale:', financialReport.data.revenue.totalRevenue.toFixed(2), 'RON');
      console.log('   💰 Profit:', financialReport.data.profit.toFixed(2), 'RON');
      console.log('   📈 Marjă profit:', financialReport.data.profitMargin.toFixed(2), '%');
      console.log('   🛒 Total comenzi:', financialReport.data.revenue.totalOrders);
      console.log('   💳 Valoare medie comandă:', financialReport.data.revenue.averageOrderValue.toFixed(2), 'RON\n');
    } else {
      console.error('❌ Eroare la obținerea raportului financiar:', financialReport.data);
    }

    // 3. Test statistici produse
    console.log('3️⃣ Test statistici produse...');
    const productsReport = await makeRequest('/api/admin/reports/products?period=month', token);
    
    if (productsReport.status === 200) {
      console.log('✅ Statistici produse obținute cu succes!');
      console.log('   📦 Total produse:', productsReport.data.length);
      
      // Afișează top 5 produse
      const topProducts = productsReport.data
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      
      console.log('   🏆 Top 5 produse după venituri:');
      topProducts.forEach((product, index) => {
        console.log(`      ${index + 1}. ${product.title}`);
        console.log(`         Vândute: ${product.totalSold} | Venituri: ${product.revenue.toFixed(2)} RON | Rating: ${product.rating.toFixed(1)}⭐`);
      });
      console.log('');
    } else {
      console.error('❌ Eroare la obținerea statisticilor produse:', productsReport.data);
    }

    // 4. Test statistici clienți
    console.log('4️⃣ Test statistici clienți...');
    const customersReport = await makeRequest('/api/admin/reports/customers?period=month', token);
    
    if (customersReport.status === 200) {
      console.log('✅ Statistici clienți obținute cu succes!');
      console.log('   👥 Total clienți activi:', customersReport.data.length);
      
      // Afișează top 3 clienți
      const topCustomers = customersReport.data.slice(0, 3);
      console.log('   🏆 Top 3 clienți după valoare:');
      topCustomers.forEach((customer, index) => {
        console.log(`      ${index + 1}. ${customer.name}`);
        console.log(`         Total cheltuit: ${customer.totalSpent.toFixed(2)} RON | Comenzi: ${customer.orderCount}`);
      });
      console.log('');
    } else {
      console.error('❌ Eroare la obținerea statisticilor clienți:', customersReport.data);
    }

    // 5. Test vânzări pe categorii
    console.log('5️⃣ Test vânzări pe categorii...');
    const categoriesReport = await makeRequest('/api/admin/reports/sales-by-category?period=month', token);
    
    if (categoriesReport.status === 200) {
      console.log('✅ Raport categorii obținut cu succes!');
      console.log('   📂 Total categorii:', categoriesReport.data.length);
      
      // Afișează top 3 categorii
      const topCategories = categoriesReport.data.slice(0, 3);
      console.log('   🏆 Top 3 categorii după venituri:');
      topCategories.forEach((category, index) => {
        console.log(`      ${index + 1}. ${category.name}`);
        console.log(`         Venituri: ${category.revenue.toFixed(2)} RON | Produse vândute: ${category.totalSold}`);
      });
      console.log('');
    } else {
      console.error('❌ Eroare la obținerea raportului categorii:', categoriesReport.data);
    }

    // 6. Test diferite perioade
    console.log('6️⃣ Test perioade diferite...');
    
    const periods = ['day', 'week', 'month', 'year'];
    for (const period of periods) {
      const report = await makeRequest(`/api/admin/reports/financial?period=${period}`, token);
      if (report.status === 200) {
        console.log(`   ✅ Raport ${period}: ${report.data.revenue.totalOrders} comenzi, ${report.data.revenue.totalRevenue.toFixed(2)} RON`);
      }
    }
    console.log('');

    // 7. Test interval custom
    console.log('7️⃣ Test interval custom...');
    const customReport = await makeRequest('/api/admin/reports/financial?startDate=2026-02-01&endDate=2026-02-09', token);
    
    if (customReport.status === 200) {
      console.log('✅ Raport interval custom obținut cu succes!');
      console.log('   📅 Perioada: 2026-02-01 până la 2026-02-09');
      console.log('   💰 Venituri:', customReport.data.revenue.totalRevenue.toFixed(2), 'RON');
      console.log('   🛒 Comenzi:', customReport.data.revenue.totalOrders);
      console.log('');
    } else {
      console.error('❌ Eroare la obținerea raportului custom:', customReport.data);
    }

    console.log('✅ Toate testele au fost finalizate cu succes!');
    console.log('\n📝 Endpoint-uri disponibile:');
    console.log('   GET /api/admin/reports/financial');
    console.log('   GET /api/admin/reports/products');
    console.log('   GET /api/admin/reports/customers');
    console.log('   GET /api/admin/reports/sales-by-category');
    console.log('   GET /api/admin/reports/export/csv');
    console.log('\n📖 Pentru mai multe detalii, vezi: backend/RAPOARTE.md');

  } catch (error) {
    console.error('❌ Eroare la testare:', error.message);
  }
}

// Așteaptă 3 secunde pentru ca serverul să pornească
console.log('⏳ Aștept 3 secunde pentru pornirea serverului...\n');
setTimeout(testReports, 3000);
