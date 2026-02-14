const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupAllDuplicates() {
  console.log('🧹 Curățare completă date duplicate...\n');

  try {
    // 1. Curăță comenzile fără utilizatori valizi
    console.log('1️⃣ Verificare comenzi...');
    const orders = await prisma.order.findMany({
      include: {
        user: true,
        orderItems: true
      }
    });
    
    let deletedOrders = 0;
    for (const order of orders) {
      if (!order.user || order.orderItems.length === 0) {
        await prisma.order.delete({ where: { id: order.id } });
        deletedOrders++;
      }
    }
    console.log(`   ✅ Șterse ${deletedOrders} comenzi invalide\n`);

    // 2. Curăță facturile duplicate (skip dacă nu există modelul)
    console.log('2️⃣ Verificare facturi...');
    let deletedInvoices = 0;
    try {
      if (prisma.invoiceSimple) {
        const invoices = await prisma.invoiceSimple.findMany({
          orderBy: { createdAt: 'asc' }
        });
        
        const invoiceMap = new Map();
        
        for (const invoice of invoices) {
          const key = `${invoice.orderId}-${invoice.invoiceNumber}`;
          if (invoiceMap.has(key)) {
            await prisma.invoiceSimple.delete({ where: { id: invoice.id } });
            deletedInvoices++;
          } else {
            invoiceMap.set(key, invoice);
          }
        }
      }
    } catch (e) {
      console.log('   ⚠️  Model Invoice nu există, skip');
    }
    console.log(`   ✅ Șterse ${deletedInvoices} facturi duplicate\n`);

    // 3. Curăță cardurile de test duplicate
    console.log('3️⃣ Verificare carduri test...');
    const testCards = await prisma.testCard.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    const cardMap = new Map();
    let deletedCards = 0;
    
    for (const card of testCards) {
      const key = `${card.cardNumber}-${card.cvv}`;
      if (cardMap.has(key)) {
        await prisma.testCard.delete({ where: { id: card.id } });
        deletedCards++;
      } else {
        cardMap.set(key, card);
      }
    }
    console.log(`   ✅ Șterse ${deletedCards} carduri duplicate\n`);

    // 4. Curăță locațiile de livrare duplicate
    console.log('4️⃣ Verificare locații livrare...');
    const locations = await prisma.deliveryLocation.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    const locationMap = new Map();
    let deletedLocations = 0;
    
    for (const location of locations) {
      const key = `${location.name}-${location.address}`.toLowerCase();
      if (locationMap.has(key)) {
        await prisma.deliveryLocation.delete({ where: { id: location.id } });
        deletedLocations++;
      } else {
        locationMap.set(key, location);
      }
    }
    console.log(`   ✅ Șterse ${deletedLocations} locații duplicate\n`);

    // 5. Curăță categoriile duplicate
    console.log('5️⃣ Verificare categorii...');
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    const categoryMap = new Map();
    let deletedCategories = 0;
    
    for (const category of categories) {
      const key = category.name.toLowerCase().trim();
      if (categoryMap.has(key)) {
        // Mută produsele la categoria originală
        await prisma.dataItem.updateMany({
          where: { categoryId: category.id },
          data: { categoryId: categoryMap.get(key).id }
        });
        await prisma.category.delete({ where: { id: category.id } });
        deletedCategories++;
      } else {
        categoryMap.set(key, category);
      }
    }
    console.log(`   ✅ Șterse ${deletedCategories} categorii duplicate\n`);

    // 6. Curăță ofertele duplicate
    console.log('6️⃣ Verificare oferte...');
    const offers = await prisma.offer.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    const offerMap = new Map();
    let deletedOffers = 0;
    
    for (const offer of offers) {
      const key = `${offer.title}-${offer.discount}`.toLowerCase();
      if (offerMap.has(key)) {
        await prisma.offer.delete({ where: { id: offer.id } });
        deletedOffers++;
      } else {
        offerMap.set(key, offer);
      }
    }
    console.log(`   ✅ Șterse ${deletedOffers} oferte duplicate\n`);

    // 7. Curăță items din coș pentru produse inexistente
    console.log('7️⃣ Verificare items coș...');
    const cartItems = await prisma.cartItem.findMany({
      include: { dataItem: true }
    });
    
    let deletedCartItems = 0;
    for (const item of cartItems) {
      if (!item.dataItem) {
        await prisma.cartItem.delete({ where: { id: item.id } });
        deletedCartItems++;
      }
    }
    console.log(`   ✅ Șterse ${deletedCartItems} items invalide din coș\n`);

    // 8. Statistici finale
    console.log('📊 STATISTICI FINALE:\n');
    const stats = {
      users: await prisma.user.count(),
      products: await prisma.dataItem.count(),
      categories: await prisma.category.count(),
      orders: await prisma.order.count(),
      invoices: prisma.invoiceSimple ? await prisma.invoiceSimple.count() : 0,
      testCards: await prisma.testCard.count(),
      locations: await prisma.deliveryLocation.count(),
      offers: await prisma.offer.count(),
      carouselItems: await prisma.carouselItem.count(),
      cartItems: await prisma.cartItem.count()
    };

    console.log(`   👥 Utilizatori: ${stats.users}`);
    console.log(`   📦 Produse: ${stats.products}`);
    console.log(`   📂 Categorii: ${stats.categories}`);
    console.log(`   🛒 Comenzi: ${stats.orders}`);
    console.log(`   📄 Facturi: ${stats.invoices}`);
    console.log(`   💳 Carduri test: ${stats.testCards}`);
    console.log(`   📍 Locații livrare: ${stats.locations}`);
    console.log(`   🎉 Oferte: ${stats.offers}`);
    console.log(`   🎠 Items carousel: ${stats.carouselItems}`);
    console.log(`   🛒 Items coș: ${stats.cartItems}`);

    console.log('\n✅ Curățare completă finalizată!');

  } catch (error) {
    console.error('❌ Eroare:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAllDuplicates()
  .then(() => {
    console.log('\n🎉 Proces finalizat cu succes!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Eroare fatală:', error);
    process.exit(1);
  });
