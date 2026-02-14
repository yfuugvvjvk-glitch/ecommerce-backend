const http = require('http');

// Simulează un request la API-ul de evaluare cadouri
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/cart/evaluate-gift-rules',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE' // Trebuie înlocuit cu un token valid
  },
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`✅ Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📦 Response:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('📋 Parsed:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('⚠️ Could not parse JSON');
    }
  });
});

req.on('error', (error) => {
  console.error(`❌ Error: ${error.message}`);
});

req.on('timeout', () => {
  console.error('❌ Request timeout');
  req.destroy();
});

req.write(JSON.stringify({}));
req.end();
