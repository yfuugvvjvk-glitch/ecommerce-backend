const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPastramaStock() {
  console.log('🔍 Căutare produs "pastrama"...\n');
  
  try {
    // Caută produse care conțin "pastrama" în titlu
    const products = await prisma.dataItem.findMany({
      where: {
        title: {
          contains: 'pastrama',
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
        unitName: true,
        trackInventory: true
      }
    });
    
    if (products.length === 0) {
      console.log('❌ Nu s-au găsit produse cu "pastrama" în titlu');
      return;
    }
    
    console.log(`✅ Găsite ${products.length} produse:\n`);
    
    products.forEach(product => {
      console.log(`📦 ${product.title}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Stock: ${product.stock} ${product.unitName || 'buc'}`);
      console.log(`   Reserved: ${product.reservedStock || 0} ${product.unitName || 'buc'}`);
      console.log(`   Available: ${product.availableStock || 0} ${product.unitName || 'buc'}`);
      console.log(`   Total Sold: ${product.totalSold || 0} ${product.unitName || 'buc'}`);
      console.log(`   Track Inventory: ${product.trackInventory}`);
      console.log('');
    });
    
    // Verifică comenzile recente cu pastrama
    console.log('\n📋 Comenzi recente cu pastrama:\n');
    
    for (const product of products) {
      const orderItems = await prisma.orderItem.findMany({
        where: {
          dataItemId: product.id
        },
        include: {
          order: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              total: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      });
      
      if (orderItems.length > 0) {
        console.log(`Comenzi pentru ${product.title}:`);
        orderItems.forEach(item => {
          console.log(`  - Order ${item.order.id.slice(-6)}: ${item.quantity} ${product.unitName || 'buc'} (${item.order.status}) - ${item.order.createdAt.toLocaleString('ro-RO')}`);
        });
        console.log('');
      }
    }
    
    // Verifică mișcările de stoc
    console.log('\n📊 Mișcări de stoc recente:\n');
    
    for (const product of products) {
      const movements = await prisma.stockMovement.findMany({
        where: {
          dataItemId: product.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      });
      
      if (movements.length > 0) {
        console.log(`Mișcări pentru ${product.title}:`);
        movements.forEach(movement => {
          console.log(`  - ${movement.type}: ${movement.quantity} ${product.unitName || 'buc'} - ${movement.reason} (${movement.createdAt.toLocaleString('ro-RO')})`);
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

checkPastramaStock();
