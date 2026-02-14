const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllConfigs() {
  console.log('🔍 Verificare toate configurările din baza de date...\n');
  
  try {
    const configs = await prisma.siteConfig.findMany({
      orderBy: { key: 'asc' }
    });
    
    console.log(`✅ Găsite ${configs.length} configurări:\n`);
    
    configs.forEach((config, index) => {
      console.log(`${index + 1}. Key: ${config.key}`);
      console.log(`   Description: ${config.description || 'N/A'}`);
      console.log(`   Value: ${config.value ? (config.value.length > 100 ? config.value.substring(0, 100) + '...' : config.value) : 'NULL'}`);
      console.log('');
    });
    
    // Caută configurări legate de blocare
    const blockConfigs = configs.filter(c => 
      c.key.toLowerCase().includes('block') || 
      c.key.toLowerCase().includes('order')
    );
    
    if (blockConfigs.length > 0) {
      console.log('\n🚫 Configurări legate de blocare/comenzi:');
      blockConfigs.forEach(config => {
        console.log(`\n- ${config.key}`);
        console.log(`  Value: ${config.value}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllConfigs();
