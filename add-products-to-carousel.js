const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addProductsToCarousel() {
  console.log('🎠 Adăugare produse în carousel...\n');

  try {
    // Obține produsele active
    const products = await prisma.dataItem.findMany({
      where: {
        status: 'published',
        stock: { gt: 0 }
      },
      orderBy: { createdAt: 'desc' },
      take: 5 // Primele 5 produse
    });

    console.log(`📦 Găsite ${products.length} produse pentru carousel\n`);

    if (products.length === 0) {
      console.log('⚠️  Nu există produse disponibile pentru carousel');
      return;
    }

    // Șterge items existente din carousel
    await prisma.carouselItem.deleteMany({});
    console.log('🗑️  Carousel curățat\n');

    // Găsește un admin pentru createdById
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!admin) {
      console.log('⚠️  Nu există admin în sistem');
      return;
    }

    // Adaugă produsele în carousel
    let position = 1;
    for (const product of products) {
      await prisma.carouselItem.create({
        data: {
          type: 'product',
          position: position,
          productId: product.id,
          isActive: true,
          createdById: admin.id
        }
      });

      console.log(`✅ Adăugat în carousel (poziția ${position}): ${product.title}`);
      position++;
    }

    console.log(`\n🎉 ${products.length} produse adăugate în carousel cu succes!`);

    // Afișează statistici
    const carouselCount = await prisma.carouselItem.count();
    console.log(`\n📊 Total items în carousel: ${carouselCount}`);

  } catch (error) {
    console.error('❌ Eroare:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addProductsToCarousel()
  .then(() => {
    console.log('\n✅ Proces finalizat!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Eroare fatală:', error);
    process.exit(1);
  });
