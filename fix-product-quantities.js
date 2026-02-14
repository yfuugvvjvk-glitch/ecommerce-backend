const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixProductQuantities() {
  try {
    console.log('🔧 Corectare cantități produse...\n');

    // Găsește produsul "Lapte de vacă"
    const lapte = await prisma.dataItem.findFirst({
      where: { title: 'Lapte de vacă' },
    });

    if (lapte) {
      // Actualizează cu cantități fixe: 1, 2, 3, 4, 5 litri
      await prisma.dataItem.update({
        where: { id: lapte.id },
        data: {
          minQuantity: 1,
          quantityStep: 1,
          allowFractional: false,
          availableQuantities: JSON.stringify([1, 2, 3, 4, 5]),
        },
      });
      console.log('✅ Lapte de vacă actualizat: cantități 1, 2, 3, 4, 5 litri');
    }

    // Găsește produsul "Brânză de burduf"
    const branza = await prisma.dataItem.findFirst({
      where: { title: 'Brânză de burduf' },
    });

    if (branza) {
      // Actualizează cu cantități fixe: 0.25, 0.5, 1, 2 kg
      await prisma.dataItem.update({
        where: { id: branza.id },
        data: {
          minQuantity: 0.25,
          quantityStep: 0.25,
          allowFractional: true,
          availableQuantities: JSON.stringify([0.25, 0.5, 1, 2]),
        },
      });
      console.log('✅ Brânză de burduf actualizată: cantități 0.25, 0.5, 1, 2 kg');
    }

    console.log('\n📊 Produse actualizate cu succes!');

  } catch (error) {
    console.error('❌ Eroare:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixProductQuantities();
