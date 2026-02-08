const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enableCarouselProducts() {
  console.log('🎨 Activare produse în carousel...\n');

  try {
    // Obține toate produsele
    const products = await prisma.dataItem.findMany({
      select: { id: true, title: true, price: true, oldPrice: true }
    });

    console.log(`📦 Găsite ${products.length} produse\n`);

    // Activează primele 5 produse în carousel
    const productsToEnable = products.slice(0, 5);

    for (let i = 0; i < productsToEnable.length; i++) {
      const product = productsToEnable[i];
      
      await prisma.dataItem.update({
        where: { id: product.id },
        data: {
          showInCarousel: true,
          carouselOrder: i + 1 // 1, 2, 3, 4, 5
        }
      });

      const discount = product.oldPrice && product.oldPrice > product.price
        ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
        : 0;

      console.log(`✅ ${i + 1}. ${product.title}`);
      console.log(`   Ordine: ${i + 1}`);
      console.log(`   Preț: ${product.price} RON${discount > 0 ? ` (reducere ${discount}%)` : ''}`);
      console.log('');
    }

    console.log('✅ Produse activate în carousel!');
    console.log('\n💡 Acum mergi la Dashboard și vei vedea produsele în carousel!');
    console.log('💡 Pentru a modifica, mergi la Admin → Produse → Configurează produs');

  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enableCarouselProducts();
