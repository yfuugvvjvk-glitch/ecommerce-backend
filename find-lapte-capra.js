const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findProduct() {
  try {
    const products = await prisma.dataItem.findMany({
      where: {
        title: {
          contains: 'Lapte',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        title: true,
        priceType: true,
        unitName: true,
        stock: true
      }
    });

    console.log('🔍 Produse găsite cu "Lapte" în titlu:\n');
    products.forEach(p => {
      console.log(`ID: ${p.id}`);
      console.log(`Titlu: ${p.title}`);
      console.log(`PriceType: ${p.priceType}`);
      console.log(`UnitName: ${p.unitName}`);
      console.log(`Stock: ${p.stock}`);
      console.log('---\n');
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Eroare:', error);
    await prisma.$disconnect();
  }
}

findProduct();
