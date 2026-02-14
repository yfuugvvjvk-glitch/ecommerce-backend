const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function publishAllProducts() {
  try {
    console.log('📝 Publicare toate produsele...');
    
    const result = await prisma.dataItem.updateMany({
      where: {
        status: 'draft'
      },
      data: {
        status: 'published'
      }
    });
    
    console.log(`✅ ${result.count} produse au fost publicate!`);
    
    // Verificare
    const published = await prisma.dataItem.count({
      where: { status: 'published' }
    });
    
    console.log(`📊 Total produse publicate: ${published}`);
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

publishAllProducts();
