const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAvailableStock() {
  console.log('🔧 Corectare availableStock pentru toate produsele\n');
  
  try {
    // Găsește toate produsele
    const products = await prisma.dataItem.findMany({
      select: {
        id: true,
        title: true,
        stock: true,
        reservedStock: true,
        availableStock: true
      }
    });
    
    console.log(`📦 Total produse: ${products.length}\n`);
    
    let fixed = 0;
    
    for (const product of products) {
      const correctAvailable = product.stock - (product.reservedStock || 0);
      
      if (product.availableStock !== correctAvailable) {
        console.log(`⚠️  ${product.title}`);
        console.log(`   Stock: ${product.stock}`);
        console.log(`   Reserved: ${product.reservedStock}`);
        console.log(`   Available (curent): ${product.availableStock}`);
        console.log(`   Available (corect): ${correctAvailable}`);
        console.log(`   Diferență: ${product.availableStock - correctAvailable}`);
        
        await prisma.dataItem.update({
          where: { id: product.id },
          data: {
            availableStock: correctAvailable
          }
        });
        
        console.log(`   ✅ Corectat!\n`);
        fixed++;
      }
    }
    
    console.log(`\n✅ Finalizat! ${fixed} produse corectate.`);
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAvailableStock();
