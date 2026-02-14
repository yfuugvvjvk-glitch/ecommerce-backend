const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLitriStock() {
  console.log('🔍 Verificare stoc produse cu litri\n');
  
  try {
    // Caută produse cu unitName = 'litri' sau 'litru'
    const products = await prisma.dataItem.findMany({
      where: {
        OR: [
          { unitName: 'litri' },
          { unitName: 'litru' },
          { unitType: 'liter' }
        ]
      },
      select: {
        id: true,
        title: true,
        stock: true,
        reservedStock: true,
        availableStock: true,
        totalSold: true,
        unitName: true,
        unitType: true
      }
    });
    
    if (products.length === 0) {
      console.log('❌ Nu s-au găsit produse cu litri');
      return;
    }
    
    console.log(`📦 Găsite ${products.length} produse:\n`);
    
    for (const product of products) {
      console.log(`${product.title}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Stock: ${product.stock} ${product.unitName}`);
      console.log(`   Reserved: ${product.reservedStock} ${product.unitName}`);
      console.log(`   Available: ${product.availableStock} ${product.unitName}`);
      console.log(`   Total Sold: ${product.totalSold} ${product.unitName}`);
      
      const correctAvailable = product.stock - (product.reservedStock || 0);
      if (Math.abs(product.availableStock - correctAvailable) > 0.01) {
        console.log(`   ⚠️  EROARE: Available ar trebui să fie ${correctAvailable}`);
        console.log(`   🔧 Diferență: ${product.availableStock - correctAvailable}`);
      } else {
        console.log(`   ✅ Stoc corect`);
      }
      
      // Verifică dacă reservedStock este negativ
      if (product.reservedStock < 0) {
        console.log(`   ❌ ATENȚIE: reservedStock este NEGATIV!`);
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLitriStock();
