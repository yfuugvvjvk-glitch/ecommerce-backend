const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUrdaReservedStock() {
  console.log('🔧 Corectare reservedStock pentru Urdă de vacă\n');
  
  try {
    const product = await prisma.dataItem.findFirst({
      where: {
        title: {
          contains: 'Urdă de vacă',
          mode: 'insensitive'
        }
      }
    });
    
    if (!product) {
      console.log('❌ Produsul nu a fost găsit');
      return;
    }
    
    console.log('📦 Produs găsit:');
    console.log(`   Titlu: ${product.title}`);
    console.log(`   Stock: ${product.stock}`);
    console.log(`   Reserved: ${product.reservedStock} ❌ (NEGATIV!)`);
    console.log(`   Available: ${product.availableStock}`);
    console.log('');
    
    // Corectăm reservedStock la 0 și recalculăm availableStock
    const correctReservedStock = 0;
    const correctAvailableStock = product.stock - correctReservedStock;
    
    console.log('🔧 Corectare:');
    console.log(`   Reserved: ${correctReservedStock}`);
    console.log(`   Available: ${correctAvailableStock}`);
    console.log('');
    
    await prisma.dataItem.update({
      where: { id: product.id },
      data: {
        reservedStock: correctReservedStock,
        availableStock: correctAvailableStock
      }
    });
    
    console.log('✅ Stoc corectat cu succes!');
    
    // Verificare finală
    const updated = await prisma.dataItem.findUnique({
      where: { id: product.id },
      select: {
        title: true,
        stock: true,
        reservedStock: true,
        availableStock: true
      }
    });
    
    console.log('\n📊 Verificare finală:');
    console.log(`   Stock: ${updated.stock}`);
    console.log(`   Reserved: ${updated.reservedStock}`);
    console.log(`   Available: ${updated.availableStock}`);
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUrdaReservedStock();
