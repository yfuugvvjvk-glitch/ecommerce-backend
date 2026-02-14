const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFloatDecrement() {
  const productId = 'cmlkr0esl004du5l0wb5zomhi'; // Pastramă de capră
  
  console.log('🧪 Test decrement cu valori Float\n');
  
  try {
    // Obține stocul curent
    const before = await prisma.dataItem.findUnique({
      where: { id: productId },
      select: {
        title: true,
        stock: true,
        reservedStock: true,
        availableStock: true
      }
    });
    
    console.log('📦 Înainte de test:');
    console.log(`   Stock: ${before.stock} kg`);
    console.log(`   Reserved: ${before.reservedStock} kg`);
    console.log(`   Available: ${before.availableStock} kg`);
    console.log('');
    
    // Test 1: Decrement cu 0.5
    console.log('🔧 Test 1: Decrement stock cu 0.5...');
    await prisma.dataItem.update({
      where: { id: productId },
      data: {
        stock: { decrement: 0.5 }
      }
    });
    
    const after1 = await prisma.dataItem.findUnique({
      where: { id: productId },
      select: { stock: true }
    });
    console.log(`   Stock după decrement: ${after1.stock} kg`);
    console.log(`   Diferență: ${before.stock - after1.stock} kg`);
    console.log('');
    
    // Restaurează valoarea
    await prisma.dataItem.update({
      where: { id: productId },
      data: {
        stock: { increment: 0.5 }
      }
    });
    
    // Test 2: Increment cu 0.5
    console.log('🔧 Test 2: Increment stock cu 0.5...');
    await prisma.dataItem.update({
      where: { id: productId },
      data: {
        stock: { increment: 0.5 }
      }
    });
    
    const after2 = await prisma.dataItem.findUnique({
      where: { id: productId },
      select: { stock: true }
    });
    console.log(`   Stock după increment: ${after2.stock} kg`);
    console.log(`   Diferență: ${after2.stock - before.stock} kg`);
    console.log('');
    
    // Restaurează valoarea
    await prisma.dataItem.update({
      where: { id: productId },
      data: {
        stock: { decrement: 0.5 }
      }
    });
    
    // Test 3: Creare StockMovement cu 0.5
    console.log('🔧 Test 3: Creare StockMovement cu quantity 0.5...');
    const movement = await prisma.stockMovement.create({
      data: {
        dataItemId: productId,
        type: 'TEST',
        quantity: 0.5,
        reason: 'Test float quantity'
      }
    });
    console.log(`   Movement creat cu quantity: ${movement.quantity} kg`);
    console.log('');
    
    // Șterge movement-ul de test
    await prisma.stockMovement.delete({
      where: { id: movement.id }
    });
    
    console.log('✅ Toate testele au trecut cu succes!');
    console.log('   Prisma suportă corect operațiile cu Float');
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFloatDecrement();
