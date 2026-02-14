const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrderBlockSettings() {
  try {
    console.log('🔍 Checking order block settings in database...\n');
    
    const config = await prisma.siteConfig.findUnique({
      where: { key: 'order_block_settings' }
    });
    
    if (config) {
      console.log('✅ Found order_block_settings in database:');
      console.log('ID:', config.id);
      console.log('Key:', config.key);
      console.log('Type:', config.type);
      console.log('Description:', config.description);
      console.log('Updated At:', config.updatedAt);
      console.log('\n📄 Raw Value:');
      console.log(config.value);
      console.log('\n📦 Parsed Value:');
      const parsed = JSON.parse(config.value);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.blockNewOrders) {
        console.log('\n⚠️  ORDERS ARE BLOCKED!');
        console.log('Reason:', parsed.blockReason || 'No reason provided');
        if (parsed.blockUntil) {
          console.log('Block Until:', parsed.blockUntil);
        } else {
          console.log('Block Until: Permanent (no expiry date)');
        }
      } else {
        console.log('\n✅ Orders are NOT blocked');
      }
    } else {
      console.log('❌ No order_block_settings found in database');
      console.log('This means the default settings are being used');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrderBlockSettings();
