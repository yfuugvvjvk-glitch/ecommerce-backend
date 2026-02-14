const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log('🧹 Curățare produse duplicate...\n');

  try {
    // Obține toate produsele
    const products = await prisma.dataItem.findMany({
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📦 Total produse găsite: ${products.length}\n`);

    // Grupează produsele după titlu și preț
    const productMap = new Map();
    const duplicates = [];

    for (const product of products) {
      const key = `${product.title.toLowerCase().trim()}-${product.price}`;
      
      if (productMap.has(key)) {
        // Este duplicat - păstrează primul, marchează restul pentru ștergere
        duplicates.push(product);
        console.log(`🔍 Duplicat găsit: "${product.title}" - ${product.price} RON (ID: ${product.id.slice(0, 8)})`);
      } else {
        productMap.set(key, product);
      }
    }

    console.log(`\n📊 Statistici:`);
    console.log(`   ✅ Produse unice: ${productMap.size}`);
    console.log(`   🗑️  Produse duplicate: ${duplicates.length}\n`);

    if (duplicates.length > 0) {
      console.log('🗑️  Ștergere duplicate...\n');
      
      for (const dup of duplicates) {
        try {
          // Șterge mai întâi relațiile
          await prisma.orderItem.deleteMany({
            where: { dataItemId: dup.id }
          });
          
          await prisma.cartItem.deleteMany({
            where: { dataItemId: dup.id }
          });
          
          await prisma.review.deleteMany({
            where: { dataItemId: dup.id }
          });
          
          await prisma.carouselItem.deleteMany({
            where: { productId: dup.id }
          });
          
          // Acum șterge produsul
          await prisma.dataItem.delete({
            where: { id: dup.id }
          });
          
          console.log(`   ✅ Șters: "${dup.title}" (ID: ${dup.id.slice(0, 8)})`);
        } catch (error) {
          console.log(`   ⚠️  Nu s-a putut șterge: "${dup.title}" - ${error.message}`);
        }
      }
    }

    // Statistici finale
    const finalCount = await prisma.dataItem.count();
    console.log(`\n✅ Curățare finalizată!`);
    console.log(`📦 Produse rămase: ${finalCount}\n`);

    // Afișează produsele rămase
    const remaining = await prisma.dataItem.findMany({
      select: {
        id: true,
        title: true,
        price: true,
        stock: true
      },
      orderBy: { title: 'asc' }
    });

    console.log('📋 Lista produse finale:');
    remaining.forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.title} - ${p.price} RON (Stoc: ${p.stock})`);
    });

  } catch (error) {
    console.error('❌ Eroare:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicates()
  .then(() => {
    console.log('\n🎉 Proces finalizat!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Eroare fatală:', error);
    process.exit(1);
  });
