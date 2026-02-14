const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrder() {
  console.log('🔍 Verificare comandă qvirfu\n');
  
  try {
    // Caută comanda după ultimele 6 caractere din ID
    const orders = await prisma.order.findMany({
      where: {
        id: {
          endsWith: 'qvirfu'
        }
      },
      include: {
        orderItems: {
          include: {
            dataItem: {
              select: {
                id: true,
                title: true,
                unitName: true
              }
            }
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    if (orders.length === 0) {
      console.log('❌ Comanda nu a fost găsită');
      return;
    }
    
    const order = orders[0];
    
    console.log('📦 Detalii comandă:');
    console.log(`   ID: ${order.id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Total: ${order.total} RON`);
    console.log(`   Client: ${order.user.name || order.user.email}`);
    console.log(`   Data: ${order.createdAt.toLocaleString('ro-RO')}`);
    console.log(`   Actualizat: ${order.updatedAt.toLocaleString('ro-RO')}`);
    console.log('');
    
    console.log('📋 Produse comandate:');
    order.orderItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.dataItem.title}`);
      console.log(`   Cantitate: ${item.quantity} ${item.dataItem.unitName}`);
      console.log(`   Preț: ${item.price} RON`);
      console.log(`   Preț original: ${item.originalPrice || 'N/A'} RON`);
      console.log(`   Este cadou: ${item.isGift ? 'Da' : 'Nu'}`);
      console.log('');
    });
    
    // Verifică mișcările de stoc pentru această comandă
    console.log('📊 Mișcări de stoc pentru această comandă:');
    const movements = await prisma.stockMovement.findMany({
      where: {
        orderId: order.id
      },
      include: {
        dataItem: {
          select: {
            title: true,
            unitName: true
          }
        }
      }
    });
    
    if (movements.length === 0) {
      console.log('   Nu există mișcări de stoc înregistrate');
    } else {
      movements.forEach((movement, index) => {
        console.log(`${index + 1}. ${movement.type}`);
        console.log(`   Produs: ${movement.dataItem.title}`);
        console.log(`   Cantitate: ${movement.quantity} ${movement.dataItem.unitName}`);
        console.log(`   Motiv: ${movement.reason}`);
        console.log(`   Data: ${movement.createdAt.toLocaleString('ro-RO')}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrder();
