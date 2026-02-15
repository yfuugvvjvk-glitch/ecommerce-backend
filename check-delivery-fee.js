const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDeliveryFee() {
  console.log('🔍 Verificare deliveryFee în baza de date...\n');

  try {
    const locations = await prisma.deliveryLocation.findMany();
    
    console.log('📍 Delivery Locations:');
    locations.forEach(loc => {
      console.log(`\n  Locație: ${loc.name}`);
      console.log(`    deliveryFee: ${loc.deliveryFee}`);
      console.log(`    typeof: ${typeof loc.deliveryFee}`);
      console.log(`    === 0: ${loc.deliveryFee === 0}`);
      console.log(`    == 0: ${loc.deliveryFee == 0}`);
      console.log(`    Number() === 0: ${Number(loc.deliveryFee) === 0}`);
    });

    console.log('\n✅ Verificare completă!');
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDeliveryFee();
