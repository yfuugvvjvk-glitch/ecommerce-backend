const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllNegativeReservedStock() {
  console.log('🔧 Verificare și corectare globală pentru reservedStock negativ\n');
  
  try {
    // Găsește TOATE produsele cu reservedStock negativ
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
      console.log('✅ Nu există produse cu reservedStock negativ - totul este OK!');
      return;
    }
    
    console.log(`⚠️  Găsite ${products.length} produse cu reservedStock negativ:\n`);
    
    let fixed = 0;
    
    for (const product of products) {
      console.log(`📦 ${product.title}`);
      console.log(`   Stock: ${product.stock} ${product.unitName}`);
      console.log(`   Reserved: ${product.reservedStock} ${product.unitName} ❌ NEGATIV`);
      console.log(`   Available: ${product.availableStock} ${product.unitName} (GREȘIT)`);
      
      // Corectăm reservedStock la 0 și recalculăm availableStock
      const correctReservedStock = 0;
      const correctAvailableStock = product.stock - correctReservedStock;
      
      console.log(`   → Corectare: Reserved = 0, Available = ${correctAvailableStock}`);
      
      await prisma.dataItem.update({
        where: { id: product.id },
        data: {
          reservedStock: correctReservedStock,
          availableStock: correctAvailableStock
        }
      });
      
      console.log(`   ✅ Corectat!\n`);
      fixed++;
    }
    
    console.log(`\n✅ ${fixed} produse au fost corectate cu succes!`);
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllNegativeReservedStock();
