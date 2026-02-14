const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProduct() {
  const productId = 'cmlcol5gq000uu5bcilrgph49';
  
  console.log(`🔍 Căutare produs cu ID: ${productId}\n`);
  
  try {
    const product = await prisma.dataItem.findUnique({
      where: { id: productId }
    });
    
    if (product) {
      console.log('✅ Produs găsit:');
      console.log(JSON.stringify(product, null, 2));
    } else {
      console.log('❌ Produsul NU există în baza de date!');
      
      // Caută produse similare
      console.log('\n📋 Primele 5 produse din baza de date:');
      const products = await prisma.dataItem.findMany({
        select: { id: true, title: true },
        take: 5
      });
      products.forEach(p => console.log(`  - ${p.id}: ${p.title}`));
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProduct();
