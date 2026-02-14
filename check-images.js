const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkImages() {
  try {
    const products = await prisma.dataItem.findMany({
      take: 10,
      select: {
        id: true,
        title: true,
        image: true,
        status: true
      }
    });
    
    console.log('📸 Verificare imagini produse:\n');
    products.forEach(p => {
      console.log(`${p.title}`);
      console.log(`  Status: ${p.status}`);
      console.log(`  Image: ${p.image || 'LIPSĂ'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkImages();
