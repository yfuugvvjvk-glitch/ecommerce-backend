const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBlockRules() {
  console.log('🔍 Verificare reguli de blocare în baza de date...\n');
  
  try {
    const config = await prisma.siteConfig.findUnique({
      where: { key: 'block_rules' }
    });
    
    if (config) {
      console.log('✅ Găsit config pentru block_rules:');
      console.log('Key:', config.key);
      console.log('Value:', config.value);
      console.log('Description:', config.description);
      
      if (config.value) {
        try {
          const rules = JSON.parse(config.value);
          console.log('\n📋 Reguli parsate:');
          console.log(JSON.stringify(rules, null, 2));
          console.log(`\nTotal reguli: ${rules.length}`);
        } catch (e) {
          console.log('❌ Eroare la parsarea JSON:', e.message);
        }
      }
    } else {
      console.log('❌ Nu există config pentru block_rules în baza de date');
      console.log('Aceasta este normal dacă nu ai creat încă nicio regulă.');
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBlockRules();
