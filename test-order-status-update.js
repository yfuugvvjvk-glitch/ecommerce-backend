const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOrderStatusUpdate() {
  console.log('🧪 Test actualizare status comandă cu cantități fracționare\n');
  
  try {
    // Creează un produs de test
    const testProduct = await prisma.dataItem.create({
      data: {
        title: 'Test Product Float',
        description: 'Test',
        content: 'Test',
        price: 100,
        stock: 10,
        availableStock: 10,
        reservedStock: 0,
        image: 'test.jpg',
        categoryId: 'cmlkkybnk0058u54ss08qpexy', // Folosește un ID valid
        userId: 'cmlcol5nk000vu5bcc2vlbklg', // Folosește un ID valid
        unitName: 'kg',
        trackInventory: true
      }
    });
    
    console.log(`✅ Produs de test creat: ${testProduct.id}`);
    console.log(`   Stock inițial: ${testProduct.stock} kg\n`);
    
    // Creează o comandă de test
    const testOrder = await prisma.order.create({
      data: {
        userId: 'cmlcol5nk000vu5bcc2vlbklg', // Folosește un ID valid
        total: 35,
        shippingAddress: 'Test Address',
        status: 'PROCESSING',
        orderItems: {
          create: [
            {
              dataItemId: testProduct.id,
              quantity: 0.5,
              price: 35
            }
          ]
        }
      },
      include: {
        orderItems: true
      }
    });
    
    console.log(`✅ Comandă de test creată: ${testOrder.id}`);
    console.log(`   Cantitate comandată: ${testOrder.orderItems[0].quantity} kg\n`);
    
    // Rezervă stocul (simulează ce face createOrder)
    await prisma.dataItem.update({
      where: { id: testProduct.id },
      data: {
        reservedStock: { increment: 0.5 },
        availableStock: { decrement: 0.5 }
      }
    });
    
    console.log('✅ Stoc rezervat\n');
    
    // Actualizează statusul la DELIVERED (simulează updateOrderStatus)
    console.log('🔄 Actualizare status la DELIVERED...\n');
    
    const order = await prisma.order.findUnique({
      where: { id: testOrder.id },
      include: {
        orderItems: {
          include: {
            dataItem: true
          }
        }
      }
    });
    
    console.log('📋 Date comandă înainte de actualizare:');
    order.orderItems.forEach(item => {
      console.log(`   Produs: ${item.dataItem.title}`);
      console.log(`   Cantitate: ${item.quantity} (type: ${typeof item.quantity})`);
      console.log(`   Cantitate === 0.5: ${item.quantity === 0.5}`);
      console.log(`   Cantitate == 0.5: ${item.quantity == 0.5}`);
    });
    console.log('');
    
    // Actualizează stocul
    for (const item of order.orderItems) {
      console.log(`🔧 Decrement stock cu ${item.quantity}...`);
      
      await prisma.dataItem.update({
        where: { id: item.dataItemId },
        data: {
          stock: { decrement: item.quantity },
          reservedStock: { decrement: item.quantity },
          totalSold: { increment: item.quantity }
        }
      });
      
      // Creează mișcare de stoc
      const movement = await prisma.stockMovement.create({
        data: {
          dataItemId: item.dataItemId,
          type: 'OUT',
          quantity: item.quantity,
          reason: `Test order delivered`,
          orderId: order.id
        }
      });
      
      console.log(`   Movement creat cu quantity: ${movement.quantity} (type: ${typeof movement.quantity})`);
    }
    
    // Verifică rezultatul
    const updatedProduct = await prisma.dataItem.findUnique({
      where: { id: testProduct.id }
    });
    
    console.log('');
    console.log('📦 Stoc după actualizare:');
    console.log(`   Stock: ${updatedProduct.stock} kg (așteptat: 9.5 kg)`);
    console.log(`   Reserved: ${updatedProduct.reservedStock} kg (așteptat: 0 kg)`);
    console.log(`   Available: ${updatedProduct.availableStock} kg (așteptat: 9.5 kg)`);
    console.log(`   Total Sold: ${updatedProduct.totalSold} kg (așteptat: 0.5 kg)`);
    console.log('');
    
    if (updatedProduct.stock === 9.5 && updatedProduct.totalSold === 0.5) {
      console.log('✅ Test PASSED - Stocul a fost actualizat corect!');
    } else {
      console.log('❌ Test FAILED - Stocul NU a fost actualizat corect!');
    }
    
    // Curăță datele de test
    console.log('');
    console.log('🧹 Curățare date de test...');
    await prisma.stockMovement.deleteMany({
      where: { orderId: testOrder.id }
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: testOrder.id }
    });
    await prisma.order.delete({
      where: { id: testOrder.id }
    });
    await prisma.dataItem.delete({
      where: { id: testProduct.id }
    });
    console.log('✅ Date de test șterse');
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testOrderStatusUpdate();
