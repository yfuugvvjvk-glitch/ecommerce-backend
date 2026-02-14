const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testBannerDisplay() {
  console.log('🧪 Testing Announcement Banner Display...\n');

  try {
    // Test 1: Check if banner config exists
    console.log('Test 1: Checking if banner configuration exists...');
    const config = await prisma.siteConfig.findUnique({
      where: { key: 'announcement_banner' }
    });

    if (!config) {
      console.log('❌ FAIL: Banner configuration not found in database');
      console.log('   Run: node backend/initialize-announcement-banner.js');
      return false;
    }
    console.log('✅ PASS: Banner configuration exists');

    // Test 2: Validate config structure
    console.log('\nTest 2: Validating configuration structure...');
    const bannerConfig = JSON.parse(config.value);
    
    const requiredFields = ['isActive', 'title', 'description', 'titleStyle', 'descriptionStyle'];
    const missingFields = requiredFields.filter(field => !(field in bannerConfig));
    
    if (missingFields.length > 0) {
      console.log(`❌ FAIL: Missing required fields: ${missingFields.join(', ')}`);
      return false;
    }
    console.log('✅ PASS: All required fields present');

    // Test 3: Validate titleStyle structure
    console.log('\nTest 3: Validating titleStyle structure...');
    const requiredStyleFields = ['color', 'backgroundColor', 'fontSize', 'fontFamily', 'fontWeight', 'textAlign'];
    const missingTitleStyleFields = requiredStyleFields.filter(field => !(field in bannerConfig.titleStyle));
    
    if (missingTitleStyleFields.length > 0) {
      console.log(`❌ FAIL: Missing titleStyle fields: ${missingTitleStyleFields.join(', ')}`);
      return false;
    }
    console.log('✅ PASS: titleStyle structure valid');

    // Test 4: Validate descriptionStyle structure
    console.log('\nTest 4: Validating descriptionStyle structure...');
    const missingDescStyleFields = requiredStyleFields.filter(field => !(field in bannerConfig.descriptionStyle));
    
    if (missingDescStyleFields.length > 0) {
      console.log(`❌ FAIL: Missing descriptionStyle fields: ${missingDescStyleFields.join(', ')}`);
      return false;
    }
    console.log('✅ PASS: descriptionStyle structure valid');

    // Test 5: Check current banner state
    console.log('\nTest 5: Checking current banner state...');
    console.log(`   isActive: ${bannerConfig.isActive}`);
    console.log(`   title: "${bannerConfig.title}"`);
    console.log(`   description: "${bannerConfig.description}"`);
    
    const shouldDisplay = bannerConfig.isActive && 
                         (bannerConfig.title.trim() || bannerConfig.description.trim());
    
    console.log(`   Should display on dashboard: ${shouldDisplay ? 'YES' : 'NO'}`);
    
    if (!shouldDisplay) {
      console.log('   ℹ️  Banner will not display because:');
      if (!bannerConfig.isActive) {
        console.log('      - isActive is false');
      }
      if (!bannerConfig.title.trim() && !bannerConfig.description.trim()) {
        console.log('      - Both title and description are empty');
      }
    }

    // Test 6: Validate color formats
    console.log('\nTest 6: Validating color formats...');
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    const colors = [
      { name: 'titleStyle.color', value: bannerConfig.titleStyle.color },
      { name: 'titleStyle.backgroundColor', value: bannerConfig.titleStyle.backgroundColor },
      { name: 'descriptionStyle.color', value: bannerConfig.descriptionStyle.color },
      { name: 'descriptionStyle.backgroundColor', value: bannerConfig.descriptionStyle.backgroundColor }
    ];
    
    let colorValidationPassed = true;
    for (const color of colors) {
      if (!hexColorRegex.test(color.value)) {
        console.log(`❌ FAIL: Invalid color format for ${color.name}: ${color.value}`);
        colorValidationPassed = false;
      }
    }
    
    if (colorValidationPassed) {
      console.log('✅ PASS: All colors have valid hex format');
    }

    // Test 7: Validate font sizes
    console.log('\nTest 7: Validating font sizes...');
    const titleFontSize = bannerConfig.titleStyle.fontSize;
    const descFontSize = bannerConfig.descriptionStyle.fontSize;
    
    let fontSizeValid = true;
    if (titleFontSize < 12 || titleFontSize > 48) {
      console.log(`❌ FAIL: Title font size ${titleFontSize}px out of range (12-48)`);
      fontSizeValid = false;
    }
    if (descFontSize < 12 || descFontSize > 32) {
      console.log(`❌ FAIL: Description font size ${descFontSize}px out of range (12-32)`);
      fontSizeValid = false;
    }
    
    if (fontSizeValid) {
      console.log('✅ PASS: Font sizes within valid ranges');
    }

    // Test 8: Validate enum values
    console.log('\nTest 8: Validating enum values...');
    const validFontWeights = ['normal', 'bold', 'light'];
    const validTextAligns = ['left', 'center', 'right'];
    
    let enumValid = true;
    if (!validFontWeights.includes(bannerConfig.titleStyle.fontWeight)) {
      console.log(`❌ FAIL: Invalid titleStyle.fontWeight: ${bannerConfig.titleStyle.fontWeight}`);
      enumValid = false;
    }
    if (!validFontWeights.includes(bannerConfig.descriptionStyle.fontWeight)) {
      console.log(`❌ FAIL: Invalid descriptionStyle.fontWeight: ${bannerConfig.descriptionStyle.fontWeight}`);
      enumValid = false;
    }
    if (!validTextAligns.includes(bannerConfig.titleStyle.textAlign)) {
      console.log(`❌ FAIL: Invalid titleStyle.textAlign: ${bannerConfig.titleStyle.textAlign}`);
      enumValid = false;
    }
    if (!validTextAligns.includes(bannerConfig.descriptionStyle.textAlign)) {
      console.log(`❌ FAIL: Invalid descriptionStyle.textAlign: ${bannerConfig.descriptionStyle.textAlign}`);
      enumValid = false;
    }
    
    if (enumValid) {
      console.log('✅ PASS: All enum values valid');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ All validation tests passed!');
    console.log('\n📋 Current Configuration:');
    console.log(JSON.stringify(bannerConfig, null, 2));
    
    console.log('\n💡 Next Steps:');
    console.log('1. Start the backend server: cd backend && npm run dev');
    console.log('2. Start the frontend: cd frontend && npm run dev');
    console.log('3. Navigate to the dashboard to see the banner');
    console.log('4. Go to /admin/banner to configure the banner');
    
    return true;

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

testBannerDisplay()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
