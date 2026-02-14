const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
  console.log('📦 Verificare produse în baza de date...\n');
  
  try {
    const products = await prisma.dataItem.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        stockDisplayMode: true,
        showInCarousel: true,
        carouselOrder: true
      },
      take: 10
    });
    
    console.log(`Găsite ${products.length} produse:\n`);
    
    products.forEach((product, index) => {
      console.log(`${index + 1}. ID: ${product.id}`);
      console.log(`   Titlu: ${product.title}`);
      console.log(`   Status: ${product.status || 'N/A'}`);
      console.log(`   Stock Display: ${product.stockDisplayMode || 'N/A'}`);
      console.log(`   In Carousel: ${product.showInCarousel ? 'Da' : 'Nu'}`);
      console.log(`   Carousel Order: ${product.carouselOrder || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
