const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testVisibility() {
  try {
    console.log('🧪 Test funcționalitate vizibilitate categorii\n');

    // 1. Ascunde categoria "Jucării"
    console.log('1️⃣ Ascundere categorie "Jucării"...');
    const jucarii = await prisma.category.update({
      where: { slug: 'jucari' },
      data: { isActive: false }
    });
    console.log(`   ✅ ${jucarii.name} este acum ${jucarii.isActive ? 'vizibilă' : 'ascunsă'}\n`);

    // 2. Ascunde o subcategorie
    console.log('2️⃣ Ascundere subcategorie "Tablete"...');
    const tablete = await prisma.category.update({
      where: { slug: 'tablete' },
      data: { isActive: false }
    });
    console.log(`   ✅ ${tablete.name} este acum ${tablete.isActive ? 'vizibilă' : 'ascunsă'}\n`);

    // 3. Afișează toate categoriile cu statusul lor
    console.log('3️⃣ Status toate categoriile:\n');
    const allCategories = await prisma.category.findMany({
      include: {
        parent: {
          select: { name: true }
        },
        _count: {
          select: { dataItems: true }
        }
      },
      orderBy: [
        { parentId: 'asc' },
        { position: 'asc' },
        { name: 'asc' }
      ]
    });

    const mainCategories = allCategories.filter(c => !c.parentId);
    const subCategories = allCategories.filter(c => c.parentId);

    console.log('📁 CATEGORII PRINCIPALE:');
    mainCategories.forEach(cat => {
      const status = cat.isActive ? '✅ Vizibilă' : '❌ Ascunsă';
      console.log(`   ${cat.icon || '📂'} ${cat.name} - ${status} (${cat._count.dataItems} produse)`);
    });

    console.log('\n📂 SUBCATEGORII:');
    subCategories.forEach(cat => {
      const status = cat.isActive ? '✅ Vizibilă' : '❌ Ascunsă';
      console.log(`   └─ ${cat.icon || '📄'} ${cat.name} - ${status} (Sub: ${cat.parent?.name})`);
    });

    // 4. Test filtrare doar categorii active
    console.log('\n4️⃣ Categorii vizibile pentru utilizatori:\n');
    const activeCategories = await prisma.category.findMany({
      where: { 
        isActive: true,
        parentId: null 
      },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { position: 'asc' }
    });

    activeCategories.forEach(cat => {
      console.log(`📁 ${cat.icon || '📂'} ${cat.name}`);
      cat.subcategories.forEach(sub => {
        console.log(`   └─ ${sub.icon || '📄'} ${sub.name}`);
      });
    });

    // 5. Reactivează categoriile pentru test
    console.log('\n5️⃣ Reactivare categorii pentru continuarea testelor...');
    await prisma.category.updateMany({
      where: { isActive: false },
      data: { isActive: true }
    });
    console.log('   ✅ Toate categoriile sunt acum vizibile\n');

    console.log('✅ Test finalizat cu succes!');

  } catch (error) {
    console.error('❌ Eroare:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testVisibility();
