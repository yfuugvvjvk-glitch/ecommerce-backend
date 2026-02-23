const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportDatabaseInfo() {
  try {
    console.log('📊 Exportând informații despre baza de date...\n');

    const info = {
      exportDate: new Date().toISOString(),
      statistics: {},
      sampleData: {}
    };

    // Statistici
    const [
      usersCount,
      productsCount,
      categoriesCount,
      ordersCount,
      reviewsCount,
      mediaCount,
      currenciesCount,
      giftRulesCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.category.count(),
      prisma.order.count(),
      prisma.review.count(),
      prisma.media.count(),
      prisma.currency.count(),
      prisma.giftRule.count()
    ]);

    info.statistics = {
      users: usersCount,
      products: productsCount,
      categories: categoriesCount,
      orders: ordersCount,
      reviews: reviewsCount,
      media: mediaCount,
      currencies: currenciesCount,
      giftRules: giftRulesCount
    };

    // Sample data
    info.sampleData.users = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    info.sampleData.products = await prisma.product.findMany({
      take: 10,
      include: {
        category: true,
        media: true
      }
    });

    info.sampleData.categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    info.sampleData.media = await prisma.media.findMany({
      take: 20
    });

    info.sampleData.currencies = await prisma.currency.findMany();

    info.sampleData.giftRules = await prisma.giftRule.findMany({
      include: {
        giftProduct: true
      }
    });

    // Salvează în fișier JSON
    fs.writeFileSync(
      'database-export.json',
      JSON.stringify(info, null, 2),
      'utf-8'
    );

    console.log('✅ Export complet salvat în database-export.json\n');
    console.log('📊 Statistici:');
    console.log(`   - Utilizatori: ${usersCount}`);
    console.log(`   - Produse: ${productsCount}`);
    console.log(`   - Categorii: ${categoriesCount}`);
    console.log(`   - Comenzi: ${ordersCount}`);
    console.log(`   - Recenzii: ${reviewsCount}`);
    console.log(`   - Media: ${mediaCount}`);
    console.log(`   - Valute: ${currenciesCount}`);
    console.log(`   - Reguli cadouri: ${giftRulesCount}`);

  } catch (error) {
    console.error('❌ Eroare la export:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportDatabaseInfo();
