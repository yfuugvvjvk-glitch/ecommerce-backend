const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteTestProducts() {
  try {
    console.log('🗑️  Ștergere produse de test...\n');

    // Șterge produsele de test
    const result = await prisma.dataItem.deleteMany({
      where: {
        OR: [
          { title: 'Lapte de vacă' },
          { title: 'Brânză de burduf' }
        ]
      }
    });

    console.log(`✅ Șterse ${result.count} produse`);

    // Verifică produsele rămase
    const remaining = await prisma.dataItem.count();
    console.log(`📊 Produse rămase în baza de date: ${remaining}`);

  } catch (error) {
    console.error('❌ Eroare:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestProducts();
