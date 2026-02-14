const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteTestElements() {
  try {
    console.log('🗑️  Deleting test UI elements...');

    // Șterge elementele "Contact" și "Oferte Speciale"
    const result = await prisma.uIElement.deleteMany({
      where: {
        OR: [
          { label: 'Contact' },
          { label: 'Oferte Speciale' }
        ]
      }
    });

    console.log(`✅ Deleted ${result.count} test elements`);
    console.log('✅ Only "Chat AI" element remains');

  } catch (error) {
    console.error('❌ Error deleting test elements:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestElements();
