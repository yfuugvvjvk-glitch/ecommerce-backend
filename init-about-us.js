const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function initAboutUs() {
  console.log('🔄 Inițializare configurație "Despre Noi"...');

  try {
    // Verifică dacă există deja
    const existing = await prisma.siteConfig.findUnique({
      where: { key: 'about_us' }
    });

    if (existing) {
      console.log('✓ Configurația "about_us" există deja');
      return;
    }

    // Creează configurația
    await prisma.siteConfig.create({
      data: {
        id: crypto.randomUUID(),
        key: 'about_us',
        value: 'Bun venit la Din ograda mea direct pe masa ta! Suntem o fermă locală dedicată să aducă produse proaspete și naturale direct de la noi la tine acasă. Cu pasiune pentru agricultură și respect pentru natură, cultivăm produse de cea mai înaltă calitate, fără chimicale dăunătoare. Fiecare produs este ales cu grijă pentru a-ți oferi cea mai bună experiență. Misiunea noastră este să promovăm un stil de viață sănătos prin produse naturale, proaspete și accesibile pentru toată familia.',
        type: 'text',
        description: 'Textul Despre Noi care apare în pagina Despre și în footer',
        isPublic: true,
        updatedAt: new Date()
      }
    });

    console.log('✅ Configurația "about_us" a fost adăugată cu succes!');
  } catch (error) {
    console.error('❌ Eroare:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initAboutUs()
  .then(() => {
    console.log('\n🎉 Gata!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Eroare:', error);
    process.exit(1);
  });
