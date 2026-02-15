const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearTranslations() {
  console.log('🗑️  Ștergere traduceri existente...');

  try {
    const result = await prisma.translation.deleteMany({});
    console.log(`✅ ${result.count} traduceri șterse cu succes!`);
    console.log('💡 Traducerile vor fi regenerate automat la următoarea cerere.');
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearTranslations();
