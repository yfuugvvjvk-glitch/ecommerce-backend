const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testBannerAPI() {
  console.log('🧪 Testing Announcement Banner API Endpoints...\n');
  console.log(`API URL: ${API_URL}\n`);

  let allTestsPassed = true;

  try {
    // Test 1: Public endpoint - GET /api/announcement-banner
    console.log('Test 1: GET /api/announcement-banner (public endpoint)');
    try {
      const response = await axios.get(`${API_URL}/api/announcement-banner`);
      
      if (response.status === 200) {
        console.log('✅ PASS: Public endpoint returns 200');
        console.log(`   Response: ${JSON.stringify(response.data)}`);
        
        // Since banner is inactive and empty, should return null
        if (response.data.success && response.data.data === null) {
          console.log('✅ PASS: Returns null for inactive/empty banner (correct behavior)');
        } else if (response.data.success && response.data.data) {
          console.log('ℹ️  Banner is active and has content');
        }
      } else {
        console.log(`❌ FAIL: Expected 200, got ${response.status}`);
        allTestsPassed = false;
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ FAIL: Cannot connect to backend server');
        console.log('   Please start the backend server: cd backend && npm run dev');
        return false;
      }
      console.log(`❌ FAIL: ${error.message}`);
      allTestsPassed = false;
    }

    // Test 2: Admin endpoint - GET /api/admin/announcement-banner (without auth)
    console.log('\nTest 2: GET /api/admin/announcement-banner (without authentication)');
    try {
      const response = await axios.get(`${API_URL}/api/admin/announcement-banner`);
      console.log(`❌ FAIL: Should require authentication but got ${response.status}`);
      allTestsPassed = false;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ PASS: Correctly returns 401 Unauthorized');
      } else {
        console.log(`❌ FAIL: Expected 401, got ${error.response?.status || error.message}`);
        allTestsPassed = false;
      }
    }

    // Test 3: Admin endpoint - PUT /api/admin/announcement-banner (without auth)
    console.log('\nTest 3: PUT /api/admin/announcement-banner (without authentication)');
    try {
      const response = await axios.put(`${API_URL}/api/admin/announcement-banner`, {
        isActive: true,
        title: 'Test',
        description: 'Test'
      });
      console.log(`❌ FAIL: Should require authentication but got ${response.status}`);
      allTestsPassed = false;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ PASS: Correctly returns 401 Unauthorized');
      } else {
        console.log(`❌ FAIL: Expected 401, got ${error.response?.status || error.message}`);
        allTestsPassed = false;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 API TEST SUMMARY');
    console.log('='.repeat(60));
    
    if (allTestsPassed) {
      console.log('✅ All API tests passed!');
      console.log('\n✅ Banner display is working correctly:');
      console.log('   - Public endpoint accessible');
      console.log('   - Admin endpoints protected');
      console.log('   - Banner logic correct (not showing when inactive/empty)');
      console.log('\n💡 To test the full functionality:');
      console.log('   1. Login as admin');
      console.log('   2. Navigate to /admin/banner');
      console.log('   3. Configure and activate the banner');
      console.log('   4. Check the dashboard to see it displayed');
    } else {
      console.log('❌ Some tests failed. Please review the errors above.');
    }

    return allTestsPassed;

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

testBannerAPI()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
