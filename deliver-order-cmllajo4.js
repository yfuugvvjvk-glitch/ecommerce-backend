const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deliverOrder() {
  const orderId = 'cmllajo47004du5ikmiql85jl';
  
  console.log('📦 Schimbare status comandă la DELIVERED\n');
  
  try {
    // Găsește comanda
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            dataItem: {
              select: {
                id: true,
                title: true,
                stock: true,
                reservedStock: true,
                availableStock: true,
                totalSold: true,
                unitName: true
              }
            }
          }
        }
      }
    });
    
    if (!order) {
      console.log('❌ Comanda nu a fost găsită');
      return;
    }
    
    console.log(`📋 Comandă: ${order.id}`);
    console.log(`   Status curent: ${order.status}`);
    console.log('');
    
    console.log('📦 Produse înainte de livrare:');
    order.orderItems.forEach(item => {
      console.log(`   ${item.dataItem.title}`);
      console.log(`      Cantitate: ${item.quantity} ${item.dataItem.unitName}`);
      console.log(`      Stock: ${item.dataItem.stock} ${item.dataItem.unitName}`);
      console.log(`      Reserved: ${item.dataItem.reservedStock} ${item.dataItem.unitName}`);
      console.log(`      Available: ${item.dataItem.availableStock} ${item.dataItem.unitName}`);
      console.log(`      Total Sold: ${item.dataItem.totalSold} ${item.dataItem.unitName}`);
    });
    console.log('');
    
    // Actualizează statusul folosind tranzacție
    await prisma.$transaction(async (tx) => {
      const previousStatus = order.status;
      
      // Actualizează statusul comenzii
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERED' }
      });
      
      // Pentru fiecare produs din comandă
      for (const item of order.orderItems) {
        if (previousStatus === 'PROCESSING') {
          // Scade din stock și din reservedStock
          await tx.dataItem.update({
            where: { id: item.dataItemId },
            data: {
              stock: { decrement: item.quantity },
              reservedStock: { decrement: item.quantity },
              totalSold: { increment: item.quantity }
            }
          });
          
          // Creează mișcare de stoc
          await tx.stockMovement.create({
            data: {
              dataItemId: item.dataItemId,
              type: 'OUT',
              quantity: item.quantity,
              reason: `Order delivered #${orderId.slice(-6)}`,
              orderId: orderId
            }
          });
        }
      }
    });
    
    console.log('✅ Status schimbat la DELIVERED\n');
    
    // Verifică stocul după livrare
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            dataItem: {
              select: {
                id: true,
                title: true,
                stock: true,
                reservedStock: true,
                availableStock: true,
                totalSold: true,
                unitName: true
              }
            }
          }
        }
      }
    });
    
    console.log('📦 Produse după livrare:');
    updatedOrder.orderItems.forEach(item => {
      console.log(`   ${item.dataItem.title}`);
      console.log(`      Cantitate: ${item.quantity} ${item.dataItem.unitName}`);
      console.log(`      Stock: ${item.dataItem.stock} ${item.dataItem.unitName}`);
      console.log(`      Reserved: ${item.dataItem.reservedStock} ${item.dataItem.unitName}`);
      console.log(`      Available: ${item.dataItem.availableStock} ${item.dataItem.unitName}`);
      console.log(`      Total Sold: ${item.dataItem.totalSold} ${item.dataItem.unitName}`);
    });
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deliverOrder();
