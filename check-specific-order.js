const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrder() {
  console.log('🔍 Verificare comenzi...\n');
  
  try {
    const count = await prisma.order.count();
    console.log(`Total comenzi în baza de date: ${count}\n`);
    
    if (count === 0) {
      console.log('❌ Nu există comenzi în baza de date');
      return;
    }
    
    const orders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        deliveryMethod: true,
        deliveryLocationId: true,
        createdAt: true,
        user: {
          select: { name: true }
        }
      }
    });
    
    console.log(`Ultimele ${orders.length} comenzi:\n`);
    
    orders.forEach((order, index) => {
      console.log(`${index + 1}. ID: ${order.id}`);
      console.log(`   ID trunchiat: ${order.id.slice(0, 8)}`);
      console.log(`   User: ${order.user.name}`);
      console.log(`   deliveryMethod: ${order.deliveryMethod}`);
      console.log(`   deliveryLocationId: ${order.deliveryLocationId || 'NULL'}`);
      console.log(`   Data: ${order.createdAt}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrder();
