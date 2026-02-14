const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findProducts() {
  console.log('🔍 Căutare produse...\n');
  
  try {
    // Caută toate produsele și afișează primele 20
    const products = await prisma.dataItem.findMany({
      select: {
        id: true,
        title: true,
        stock: true,
        reservedStock: true,
        availableStock: true,
        unitName: true
      },
      take: 30,
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    console.log(`📦 Primele ${products.length} produse (sortate după ultima actualizare):\n`);
    
    products.forEach((product, index) => {
      const cleanTitle = product.title.replace(/<[^>]*>/g, '').trim();
      console.log(`${index + 1}. ${cleanTitle}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Stock: ${product.stock} ${product.unitName || 'buc'}`);
      console.log(`   Reserved: ${product.reservedStock || 0}`);
      console.log(`   Available: ${product.availableStock || 0}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findProducts();
