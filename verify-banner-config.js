const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyBannerConfig() {
  console.log('🔍 Verificare configurație banner...\n');

  try {
    const config = await prisma.siteConfig.findUnique({
      where: { key: 'announcement_banner' }
    });

    if (!config) {
      console.log('❌ Configurația banner nu a fost găsită în baza de date.');
      return;
    }

    console.log('✅ Configurația banner a fost găsită!');
    console.log('\n📋 Detalii configurație:');
    console.log(`   ID: ${config.id}`);
    console.log(`   Key: ${config.key}`);
    console.log(`   Type: ${config.type}`);
    console.log(`   Description: ${config.description}`);
    console.log(`   Is Public: ${config.isPublic}`);
    console.log(`   Updated At: ${config.updatedAt}`);
    
    console.log('\n📄 Valoare (JSON):');
    const parsedValue = JSON.parse(config.value);
    console.log(JSON.stringify(parsedValue, null, 2));

  } catch (error) {
    console.error('❌ Eroare la verificare:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyBannerConfig();
