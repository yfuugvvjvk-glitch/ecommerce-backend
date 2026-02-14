const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUrdaStock() {
  console.log('🔍 Verificare stoc Urdă de vacă\n');
  
  try {
    // Caută produse cu "urdă" în titlu
    const products = await prisma.dataItem.findMany({
      where: {
        title: {
          contains: 'urdă',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        title: true,
        stock: true,
        reservedStock: true,
        availableStock: true,
        totalSold: true,
        unitName: true
      }
    });
    
    if (products.length === 0) {
      console.log('❌ Nu s-au găsit produse cu "urdă"');
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
      if (product.availableStock !== correctAvailable) {
        console.log(`   ⚠️  EROARE: Available ar trebui să fie ${correctAvailable}`);
      } else {
        console.log(`   ✅ Stoc corect`);
      }
      console.log('');
      
      // Verifică comenzile recente
      const orderItems = await prisma.orderItem.findMany({
        where: {
          dataItemId: product.id
        },
        include: {
          order: {
            select: {
              id: true,
              status: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          order: {
            createdAt: 'desc'
          }
        },
        take: 5
      });
      
      if (orderItems.length > 0) {
        console.log(`   📋 Comenzi recente:`);
        orderItems.forEach(item => {
          console.log(`      - ${item.quantity} ${product.unitName} (${item.order.status}) - ${item.order.createdAt.toLocaleString('ro-RO')}`);
        });
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUrdaStock();
