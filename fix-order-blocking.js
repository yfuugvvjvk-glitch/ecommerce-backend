const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOrderBlocking() {
  try {
    console.log('🔧 Fixing order blocking settings...\n');
    
    // Get current settings
    const currentConfig = await prisma.siteConfig.findUnique({
      where: { key: 'order_block_settings' }
    });
    
    if (currentConfig) {
      const currentSettings = JSON.parse(currentConfig.value);
      console.log('📄 Current settings:');
      console.log(JSON.stringify(currentSettings, null, 2));
      
      // Update to unblock orders
      const newSettings = {
        ...currentSettings,
        blockNewOrders: false,
        blockReason: '', // Clear the reason
        blockUntil: undefined
      };
      
      await prisma.siteConfig.update({
        where: { key: 'order_block_settings' },
        data: {
          value: JSON.stringify(newSettings)
        }
      });
      
      console.log('\n✅ Updated settings:');
      console.log(JSON.stringify(newSettings, null, 2));
      console.log('\n🎉 Orders are now UNBLOCKED!');
    } else {
      console.log('❌ No order_block_settings found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOrderBlocking();
