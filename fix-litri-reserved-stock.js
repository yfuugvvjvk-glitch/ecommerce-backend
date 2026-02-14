const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixLitriReservedStock() {
  console.log('🔧 Corectare reservedStock pentru produse cu litri\n');
  
  try {
    // Găsește toate produsele cu reservedStock negativ
    const products = await prisma.dataItem.findMany({
      where: {
        reservedStock: {
          lt: 0
        }
      },
      select: {
        id: true,
        title: true,
        stock: true,
        reservedStock: true,
        availableStock: true,
        unitName: true
      }
    });
    
    if (products.length === 0) {
      console.log('✅ Nu există produse cu reservedStock negativ');
      return;
    }
    
    console.log(`📦 Găsite ${products.length} produse cu reservedStock negativ:\n`);
    
    for (const product of products) {
      console.log(`${product.title}`);
      console.log(`   Stock: ${product.stock} ${product.unitName}`);
      console.log(`   Reserved: ${product.reservedStock} ${product.unitName} ❌`);
      console.log(`   Available: ${product.availableStock} ${product.unitName}`);
      console.log('');
      
      // Corectăm reservedStock la 0 și recalculăm availableStock
      const correctReservedStock = 0;
      const correctAvailableStock = product.stock - correctReservedStock;
      
      console.log('🔧 Corectare:');
      console.log(`   Reserved: ${correctReservedStock} ${product.unitName}`);
      console.log(`   Available: ${correctAvailableStock} ${product.unitName}`);
      console.log('');
      
      await prisma.dataItem.update({
        where: { id: product.id },
        data: {
          reservedStock: correctReservedStock,
          availableStock: correctAvailableStock
        }
      });
      
      console.log('✅ Corectat!\n');
    }
    
    console.log('✅ Toate produsele au fost corectate!');
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLitriReservedStock();
