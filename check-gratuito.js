const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGratuito() {
  console.log('🔍 Căutare "GRATUITO" în baza de date...\n');

  try {
    // Verifică DeliveryLocations
    const locations = await prisma.deliveryLocation.findMany();
    console.log('📍 Delivery Locations:');
    locations.forEach(loc => {
      const hasGratuito = JSON.stringify(loc).includes('GRATUITO');
      if (hasGratuito) {
        console.log('  ❌ GĂSIT în:', loc.name);
        console.log('     Date:', JSON.stringify(loc, null, 2));
      }
    });

    // Verifică SiteConfig
    const configs = await prisma.siteConfig.findMany();
    console.log('\n⚙️ Site Configs:');
    configs.forEach(cfg => {
      const hasGratuito = JSON.stringify(cfg).includes('GRATUITO');
      if (hasGratuito) {
        console.log('  ❌ GĂSIT în:', cfg.key);
        console.log('     Value:', cfg.value);
      }
    });

    console.log('\n✅ Verificare completă!');
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGratuito();
