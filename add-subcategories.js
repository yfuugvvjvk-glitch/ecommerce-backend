const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function addSubcategories() {
  try {
    console.log('📂 Adăugare subcategorii...\n');

    // Găsește categoriile principale
    const electronice = await prisma.category.findUnique({ where: { slug: 'electronice' } });
    const fashion = await prisma.category.findUnique({ where: { slug: 'fashion' } });
    const casa = await prisma.category.findUnique({ where: { slug: 'casa' } });
    const sport = await prisma.category.findUnique({ where: { slug: 'sport' } });

    // Subcategorii pentru Electronice
    if (electronice) {
      const electroniceSubcategories = [
        { name: 'Laptopuri', slug: 'laptopuri', nameRo: 'Laptopuri', nameEn: 'Laptops', icon: '💻', parentId: electronice.id, position: 1 },
        { name: 'Telefoane', slug: 'telefoane', nameRo: 'Telefoane', nameEn: 'Phones', icon: '📱', parentId: electronice.id, position: 2 },
        { name: 'Tablete', slug: 'tablete', nameRo: 'Tablete', nameEn: 'Tablets', icon: '📱', parentId: electronice.id, position: 3 },
        { name: 'Accesorii', slug: 'accesorii-electronice', nameRo: 'Accesorii', nameEn: 'Accessories', icon: '🎧', parentId: electronice.id, position: 4 },
      ];

      for (const subcat of electroniceSubcategories) {
        await prisma.category.upsert({
          where: { slug: subcat.slug },
          update: {},
          create: subcat,
        });
      }
      console.log(`✅ Adăugate ${electroniceSubcategories.length} subcategorii pentru Electronice`);
    }

    // Subcategorii pentru Fashion
    if (fashion) {
      const fashionSubcategories = [
        { name: 'Bărbați', slug: 'fashion-barbati', nameRo: 'Bărbați', nameEn: 'Men', icon: '👔', parentId: fashion.id, position: 1 },
        { name: 'Femei', slug: 'fashion-femei', nameRo: 'Femei', nameEn: 'Women', icon: '👗', parentId: fashion.id, position: 2 },
        { name: 'Copii', slug: 'fashion-copii', nameRo: 'Copii', nameEn: 'Kids', icon: '👶', parentId: fashion.id, position: 3 },
        { name: 'Încălțăminte', slug: 'incaltaminte', nameRo: 'Încălțăminte', nameEn: 'Footwear', icon: '👟', parentId: fashion.id, position: 4 },
      ];

      for (const subcat of fashionSubcategories) {
        await prisma.category.upsert({
          where: { slug: subcat.slug },
          update: {},
          create: subcat,
        });
      }
      console.log(`✅ Adăugate ${fashionSubcategories.length} subcategorii pentru Fashion`);
    }

    // Subcategorii pentru Casă & Grădină
    if (casa) {
      const casaSubcategories = [
        { name: 'Mobilier', slug: 'mobilier', nameRo: 'Mobilier', nameEn: 'Furniture', icon: '🛋️', parentId: casa.id, position: 1 },
        { name: 'Decorațiuni', slug: 'decoratiuni', nameRo: 'Decorațiuni', nameEn: 'Decorations', icon: '🖼️', parentId: casa.id, position: 2 },
        { name: 'Grădinărit', slug: 'gradinarit', nameRo: 'Grădinărit', nameEn: 'Gardening', icon: '🌱', parentId: casa.id, position: 3 },
        { name: 'Unelte', slug: 'unelte', nameRo: 'Unelte', nameEn: 'Tools', icon: '🔨', parentId: casa.id, position: 4 },
      ];

      for (const subcat of casaSubcategories) {
        await prisma.category.upsert({
          where: { slug: subcat.slug },
          update: {},
          create: subcat,
        });
      }
      console.log(`✅ Adăugate ${casaSubcategories.length} subcategorii pentru Casă & Grădină`);
    }

    // Subcategorii pentru Sport
    if (sport) {
      const sportSubcategories = [
        { name: 'Fitness', slug: 'fitness', nameRo: 'Fitness', nameEn: 'Fitness', icon: '💪', parentId: sport.id, position: 1 },
        { name: 'Fotbal', slug: 'fotbal', nameRo: 'Fotbal', nameEn: 'Football', icon: '⚽', parentId: sport.id, position: 2 },
        { name: 'Baschet', slug: 'baschet', nameRo: 'Baschet', nameEn: 'Basketball', icon: '🏀', parentId: sport.id, position: 3 },
        { name: 'Ciclism', slug: 'ciclism', nameRo: 'Ciclism', nameEn: 'Cycling', icon: '🚴', parentId: sport.id, position: 4 },
      ];

      for (const subcat of sportSubcategories) {
        await prisma.category.upsert({
          where: { slug: subcat.slug },
          update: {},
          create: subcat,
        });
      }
      console.log(`✅ Adăugate ${sportSubcategories.length} subcategorii pentru Sport`);
    }

    // Afișează toate categoriile cu subcategoriile lor
    console.log('\n📊 Structura categoriilor:\n');
    const allCategories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        subcategories: {
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    for (const category of allCategories) {
      console.log(`📁 ${category.icon || '📂'} ${category.name}`);
      if (category.subcategories.length > 0) {
        for (const subcat of category.subcategories) {
          console.log(`   └─ ${subcat.icon || '📄'} ${subcat.name}`);
        }
      }
    }

    console.log('\n✅ Subcategorii adăugate cu succes!');

  } catch (error) {
    console.error('❌ Eroare:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

addSubcategories();
