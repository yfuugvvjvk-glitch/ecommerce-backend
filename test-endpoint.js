// Simple test to check if the endpoint exists
const axios = require('axios');

async function testEndpoint() {
  try {
    // Test without auth to see if endpoint exists
    console.log('🔍 Testing endpoint: PUT /api/orders/admin/test-id/status');
    const response = await axios.put('http://localhost:3001/api/orders/admin/test-id/status', {
      status: 'DELIVERED'
    });
    console.log('✅ Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.log(`📍 Endpoint exists! Status: ${error.response.status}`);
      console.log(`📍 Error: ${error.response.data.error || error.response.data.message}`);
      
      if (error.response.status === 401) {
        console.log('✅ Endpoint is working (requires authentication)');
      } else if (error.response.status === 404) {
        console.log('❌ Endpoint NOT FOUND - route not registered');
      } else {
        console.log(`⚠️  Endpoint exists but returned ${error.response.status}`);
      }
    } else {
      console.error('❌ Network error:', error.message);
    }
  }
}

testEndpoint();
