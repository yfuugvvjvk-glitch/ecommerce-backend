// Test script to verify order status update endpoint
const axios = require('axios');

async function testStatusUpdate() {
  try {
    // First, get an admin token (you'll need to replace with actual admin credentials)
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@example.com', // Replace with your admin email
      password: 'admin123' // Replace with your admin password
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Get all orders to find one to test with
    console.log('\n📋 Fetching orders...');
    const ordersResponse = await axios.get('http://localhost:3001/api/orders/admin/all', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const orders = ordersResponse.data.orders;
    console.log(`✅ Found ${orders.length} orders`);
    
    if (orders.length === 0) {
      console.log('❌ No orders found to test with');
      return;
    }
    
    // Find a CANCELLED order to test with
    const cancelledOrder = orders.find(o => o.status === 'CANCELLED');
    
    if (!cancelledOrder) {
      console.log('⚠️  No CANCELLED orders found. Using first order:', orders[0].id);
      console.log('   Current status:', orders[0].status);
      
      // Test with first order
      const testOrder = orders[0];
      console.log('\n🔄 Testing status update...');
      console.log(`   Order ID: ${testOrder.id}`);
      console.log(`   Current status: ${testOrder.status}`);
      console.log(`   Changing to: PROCESSING`);
      
      const updateResponse = await axios.put(
        `http://localhost:3001/api/orders/admin/${testOrder.id}/status`,
        { status: 'PROCESSING' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Status update successful!');
      console.log('   Response:', JSON.stringify(updateResponse.data, null, 2));
    } else {
      console.log(`\n✅ Found CANCELLED order: ${cancelledOrder.id}`);
      console.log('   Testing CANCELLED → DELIVERED transition...');
      
      // Get product stock before update
      const productId = cancelledOrder.orderItems[0].dataItemId;
      const productBefore = await axios.get(`http://localhost:3001/api/products/${productId}`);
      console.log(`\n📦 Product stock BEFORE update:`);
      console.log(`   Product: ${productBefore.data.title}`);
      console.log(`   Stock: ${productBefore.data.stock}`);
      console.log(`   Available: ${productBefore.data.availableStock}`);
      console.log(`   Reserved: ${productBefore.data.reservedStock}`);
      
      // Update status
      const updateResponse = await axios.put(
        `http://localhost:3001/api/orders/admin/${cancelledOrder.id}/status`,
        { status: 'DELIVERED' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('\n✅ Status update successful!');
      
      // Get product stock after update
      const productAfter = await axios.get(`http://localhost:3001/api/products/${productId}`);
      console.log(`\n📦 Product stock AFTER update:`);
      console.log(`   Product: ${productAfter.data.title}`);
      console.log(`   Stock: ${productAfter.data.stock}`);
      console.log(`   Available: ${productAfter.data.availableStock}`);
      console.log(`   Reserved: ${productAfter.data.reservedStock}`);
      
      console.log(`\n📊 Stock changes:`);
      console.log(`   Stock: ${productBefore.data.stock} → ${productAfter.data.stock} (${productAfter.data.stock - productBefore.data.stock})`);
      console.log(`   Available: ${productBefore.data.availableStock} → ${productAfter.data.availableStock} (${productAfter.data.availableStock - productBefore.data.availableStock})`);
      console.log(`   Reserved: ${productBefore.data.reservedStock} → ${productAfter.data.reservedStock} (${productAfter.data.reservedStock - productBefore.data.reservedStock})`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testStatusUpdate();
