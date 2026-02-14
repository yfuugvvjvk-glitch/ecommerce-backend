const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function convertToFixedProducts() {
  try {
    console.log('🔧 Conversie produse la tip "fixed" (bucăți)...\n');

    // Găsește produsul "Lapte de vacă"
    const lapte = await prisma.dataItem.findFirst({
      where: { title: 'Lapte de vacă' },
    });

    if (lapte) {
      // Convertește la produs fix: 1 bucată = 1 litru
      await prisma.dataItem.update({
        where: { id: lapte.id },
        data: {
          priceType: 'fixed', // Preț fix per bucată
          minQuantity: 1,
          quantityStep: 1,
          allowFractional: false,
          availableQuantities: JSON.stringify([1]), // 1 litru per bucată
          unitName: 'sticlă', // Schimbă unitatea
        },
      });
      console.log('✅ Lapte de vacă convertit:');
      console.log('   - Tip: fixed (preț fix per bucată)');
      console.log('   - 1 sticlă = 1 litru');
      console.log('   - Preț: 8.50 lei/sticlă');
      console.log('   - În coș: număr de sticle (1, 2, 3...)');
    }

    // Găsește produsul "Brânză de burduf"
    const branza = await prisma.dataItem.findFirst({
      where: { title: 'Brânză de burduf' },
    });

    if (branza) {
      // Convertește la produs fix: 1 bucată = 0.5 kg
      await prisma.dataItem.update({
        where: { id: branza.id },
        data: {
          priceType: 'fixed', // Preț fix per bucată
          minQuantity: 1,
          quantityStep: 1,
          allowFractional: false,
          availableQuantities: JSON.stringify([0.5]), // 0.5 kg per bucată
          unitName: 'pachet', // Schimbă unitatea
        },
      });
      console.log('✅ Brânză de burduf convertită:');
      console.log('   - Tip: fixed (preț fix per bucată)');
      console.log('   - 1 pachet = 0.5 kg');
      console.log('   - Preț: 45 lei/pachet');
      console.log('   - În coș: număr de pachete (1, 2, 3...)');
    }

    console.log('\n📊 Conversie completă!');
    console.log('Acum în coș vei selecta numărul de produse (sticle/pachete), nu cantitatea în litri/kg.');

  } catch (error) {
    console.error('❌ Eroare:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

convertToFixedProducts();
