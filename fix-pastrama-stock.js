const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPastramaStock() {
  const productId = 'cmlkr0esl004du5l0wb5zomhi'; // Pastramă de capră
  const orderId = 'cmllfbl6m0058u5zkzyqvirfu'; // Order qvirfu
  
  console.log('🔧 Corectare stoc Pastramă de capră\n');
  
  try {
    // Obține stocul curent
    const product = await prisma.dataItem.findUnique({
      where: { id: productId },
      select: {
        title: true,
        stock: true,
        reservedStock: true,
        availableStock: true,
        totalSold: true
      }
    });
    
    console.log('📦 Stoc curent:');
    console.log(`   Stock: ${product.stock} kg`);
    console.log(`   Reserved: ${product.reservedStock} kg`);
    console.log(`   Available: ${product.availableStock} kg`);
    console.log(`   Total Sold: ${product.totalSold} kg`);
    console.log('');
    
    // Verifică comanda
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        orderId: orderId,
        dataItemId: productId
      }
    });
    
    if (!orderItem) {
      console.log('❌ OrderItem nu a fost găsit');
      return;
    }
    
    console.log(`📋 Cantitate comandată: ${orderItem.quantity} kg`);
    console.log('');
    
    // Verifică dacă stocul a fost scăzut corect
    const expectedStock = 55 - orderItem.quantity; // 55 - 0.5 = 54.5
    const expectedTotalSold = 0 + orderItem.quantity; // 0 + 0.5 = 0.5
    
    console.log('🔍 Verificare:');
    console.log(`   Stock așteptat: ${expectedStock} kg`);
    console.log(`   Stock actual: ${product.stock} kg`);
    console.log(`   Diferență: ${product.stock - expectedStock} kg`);
    console.log('');
    console.log(`   Total Sold așteptat: ${expectedTotalSold} kg`);
    console.log(`   Total Sold actual: ${product.totalSold} kg`);
    console.log(`   Diferență: ${product.totalSold - expectedTotalSold} kg`);
    console.log('');
    
    if (product.stock !== expectedStock || product.totalSold !== expectedTotalSold) {
      console.log('⚠️  Stocul NU este corect! Corectare...\n');
      
      // Corectează stocul
      await prisma.dataItem.update({
        where: { id: productId },
        data: {
          stock: { decrement: orderItem.quantity },
          totalSold: { increment: orderItem.quantity }
        }
      });
      
      // Actualizează mișcarea de stoc
      const movement = await prisma.stockMovement.findFirst({
        where: {
          orderId: orderId,
          dataItemId: productId,
          type: 'OUT'
        }
      });
      
      if (movement) {
        await prisma.stockMovement.update({
          where: { id: movement.id },
          data: {
            quantity: orderItem.quantity
          }
        });
        console.log('✅ Mișcare de stoc actualizată');
      }
      
      // Verifică din nou
      const updated = await prisma.dataItem.findUnique({
        where: { id: productId },
        select: {
          stock: true,
          totalSold: true
        }
      });
      
      console.log('');
      console.log('📦 Stoc după corectare:');
      console.log(`   Stock: ${updated.stock} kg`);
      console.log(`   Total Sold: ${updated.totalSold} kg`);
      console.log('');
      console.log('✅ Stocul a fost corectat cu succes!');
    } else {
      console.log('✅ Stocul este corect!');
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPastramaStock();
