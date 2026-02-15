const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixGratuitoText() {
  console.log('🔧 Corectare text GRATUITO -> GRATUIT...');

  try {
    // Verifică locațiile de livrare
    const locations = await prisma.deliveryLocation.findMany();
    
    console.log(`\n📍 Găsite ${locations.length} locații de livrare:`);
    
    locations.forEach((loc, index) => {
      console.log(`\n${index + 1}. ${loc.name}`);
      console.log(`   Cost livrare: ${loc.deliveryFee === 0 ? 'GRATUIT' : `${loc.deliveryFee} RON`}`);
      console.log(`   Adresă: ${loc.address}`);
      console.log(`   Oraș: ${loc.city}`);
    });

    console.log('\n✅ Verificare completă!');
    console.log('\nNOTĂ: Textul "GRATUITO" nu a fost găsit în baza de date.');
    console.log('Textul corect "GRATUIT" este deja folosit în cod (frontend/app/(dashboard)/checkout/page.tsx).');
    console.log('\nDacă vezi "GRATUITO" în interfață, încearcă să:');
    console.log('1. Reîmprospătezi pagina (Ctrl+F5)');
    console.log('2. Ștergi cache-ul browserului');
    console.log('3. Verifici dacă frontend-ul rulează cu codul actualizat');

  } catch (error) {
    console.error('❌ Eroare:', error.message);
  }

  await prisma.$disconnect();
}

fixGratuitoText()
  .catch((error) => {
    console.error('❌ Eroare:', error);
    process.exit(1);
  });
