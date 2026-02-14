import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupFakeData() {
  console.log('🧹 Începe curățarea datelor fictive...\n');

  try {
    // 1. Șterge comenzile fictive (fără utilizatori reali)
    console.log('1️⃣ Ștergere comenzi fictive...');
    const deletedOrders = await prisma.order.deleteMany({
      where: {
        OR: [
          { userId: { contains: 'fake' } },
          { userId: { contains: 'test' } },
          { shippingAddress: { contains: 'Fake' } },
          { shippingAddress: { contains: 'Test' } }
        ]
      }
    });
    console.log(`   ✅ Șterse ${deletedOrders.count} comenzi fictive\n`);

    // 2. Șterge facturile fictive
    console.log('2️⃣ Ștergere facturi fictive...');
    const deletedInvoices = await prisma.invoice.deleteMany({
      where: {
        OR: [
          { companyName: { contains: 'Fake' } },
          { companyName: { contains: 'Test' } },
          { fiscalCode: { contains: 'FAKE' } }
        ]
      }
    });
    console.log(`   ✅ Șterse ${deletedInvoices.count} facturi fictive\n`);

    // 3. Șterge cardurile de test duplicate
    console.log('3️⃣ Ștergere carduri de test duplicate...');
    const testCards = await prisma.testCard.findMany();
    const uniqueCards = new Map();
    
    for (const card of testCards) {
      const key = `${card.cardNumber}-${card.cvv}`;
      if (uniqueCards.has(key)) {
        await prisma.testCard.delete({ where: { id: card.id } });
        console.log(`   🗑️ Șters card duplicat: ${card.cardNumber}`);
      } else {
        uniqueCards.set(key, card);
      }
    }
    console.log(`   ✅ Curățare carduri finalizată\n`);

    // 4. Șterge adresele fictive
    console.log('4️⃣ Ștergere adrese fictive...');
    const deletedAddresses = await prisma.deliveryLocation.deleteMany({
      where: {
        OR: [
          { name: { contains: 'Fake' } },
          { name: { contains: 'Test' } },
          { address: { contains: 'Fake' } }
        ]
      }
    });
    console.log(`   ✅ Șterse ${deletedAddresses.count} adrese fictive\n`);

    // 5. Curăță produsele duplicate (același titlu și preț)
    console.log('5️⃣ Curățare produse duplicate...');
    const products = await prisma.dataItem.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    const productMap = new Map();
    let duplicateCount = 0;
    
    for (const product of products) {
      const key = `${product.title}-${product.price}`;
      if (productMap.has(key)) {
        // Păstrează primul produs, șterge duplicatul
        await prisma.dataItem.delete({ where: { id: product.id } });
        duplicateCount++;
        console.log(`   🗑️ Șters produs duplicat: ${product.title}`);
      } else {
        productMap.set(key, product);
      }
    }
    console.log(`   ✅ Șterse ${duplicateCount} produse duplicate\n`);

    // 6. Verifică și repară relațiile între comenzi și produse
    console.log('6️⃣ Verificare și reparare relații comenzi-produse...');
    const orders = await prisma.order.findMany({
      include: {
        orderItems: {
          include: {
            dataItem: true
          }
        }
      }
    });

    let repairedOrders = 0;
    for (const order of orders) {
      let needsUpdate = false;
      
      for (const item of order.orderItems) {
        if (!item.dataItem) {
          // Șterge item-ul dacă produsul nu mai există
          await prisma.orderItem.delete({ where: { id: item.id } });
          needsUpdate = true;
          console.log(`   🔧 Șters item invalid din comanda ${order.id}`);
        }
      }
      
      if (needsUpdate) {
        // Recalculează totalul comenzii
        const remainingItems = await prisma.orderItem.findMany({
          where: { orderId: order.id }
        });
        
        if (remainingItems.length === 0) {
          // Șterge comanda dacă nu mai are items
          await prisma.order.delete({ where: { id: order.id } });
          console.log(`   🗑️ Ștearsă comandă fără produse: ${order.id}`);
        } else {
          const newTotal = remainingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          await prisma.order.update({
            where: { id: order.id },
            data: { total: newTotal }
          });
          repairedOrders++;
        }
      }
    }
    console.log(`   ✅ Reparate ${repairedOrders} comenzi\n`);

    // 7. Curăță rapoartele financiare fictive
    console.log('7️⃣ Curățare rapoarte financiare fictive...');
    const deletedReports = await prisma.financialReport.deleteMany({
      where: {
        OR: [
          { notes: { contains: 'test' } },
          { notes: { contains: 'fake' } }
        ]
      }
    });
    console.log(`   ✅ Șterse ${deletedReports.count} rapoarte fictive\n`);

    // 8. Verifică integritatea datelor
    console.log('8️⃣ Verificare integritate date...');
    
    const stats = {
      users: await prisma.user.count(),
      products: await prisma.dataItem.count(),
      orders: await prisma.order.count(),
      invoices: await prisma.invoice.count(),
      testCards: await prisma.testCard.count(),
      locations: await prisma.deliveryLocation.count(),
      carouselItems: await prisma.carouselItem.count()
    };

    console.log('\n📊 Statistici finale:');
    console.log(`   👥 Utilizatori: ${stats.users}`);
    console.log(`   📦 Produse: ${stats.products}`);
    console.log(`   🛒 Comenzi: ${stats.orders}`);
    console.log(`   📄 Facturi: ${stats.invoices}`);
    console.log(`   💳 Carduri test: ${stats.testCards}`);
    console.log(`   📍 Locații livrare: ${stats.locations}`);
    console.log(`   🎠 Items carousel: ${stats.carouselItems}`);

    console.log('\n✅ Curățare finalizată cu succes!');
    
  } catch (error) {
    console.error('❌ Eroare la curățare:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupFakeData()
  .then(() => {
    console.log('\n🎉 Proces finalizat!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Eroare fatală:', error);
    process.exit(1);
  });
