const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/health',
  method: 'GET',
  timeout: 3000
};

const req = http.request(options, (res) => {
  console.log(`✅ Server răspunde: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(`❌ Eroare: ${error.message}`);
});

req.on('timeout', () => {
  console.error('❌ Timeout - serverul nu răspunde');
  req.destroy();
});

req.end();
