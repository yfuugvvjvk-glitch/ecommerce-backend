const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrder() {
  console.log('🔍 Verificare comandă #cmllajo4\n');
  
  try {
    // Caută comanda
    const orders = await prisma.order.findMany({
      where: {
        id: {
          contains: 'cmllajo4'
        }
      },
      include: {
        orderItems: {
          include: {
            dataItem: {
              select: {
                id: true,
                title: true,
                unitName: true,
                stock: true,
                reservedStock: true,
                availableStock: true
              }
            }
          }
        }
      }
    });
    
    if (orders.length === 0) {
      console.log('❌ Comanda nu a fost găsită');
      return;
    }
    
    const order = orders[0];
    
    console.log(`📦 Comandă: ${order.id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Total: ${order.total} RON`);
    console.log(`   Data: ${order.createdAt.toLocaleString('ro-RO')}`);
    console.log('');
    
    console.log('📋 Produse:');
    order.orderItems.forEach(item => {
      console.log(`   - ${item.dataItem.title}`);
      console.log(`     Cantitate comandată: ${item.quantity} ${item.dataItem.unitName}`);
      console.log(`     Preț: ${item.price} RON`);
      console.log(`     Stoc curent: ${item.dataItem.stock} ${item.dataItem.unitName}`);
      console.log(`     Rezervat: ${item.dataItem.reservedStock} ${item.dataItem.unitName}`);
      console.log(`     Disponibil: ${item.dataItem.availableStock} ${item.dataItem.unitName}`);
      console.log('');
    });
    
    if (order.status !== 'DELIVERED') {
      console.log('⚠️  Comanda NU este livrată încă!');
      console.log('   Pentru a scădea stocul, schimbă statusul la DELIVERED.');
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrder();
