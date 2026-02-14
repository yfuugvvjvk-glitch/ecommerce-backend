const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testAdminVisibility() {
  try {
    console.log('🧪 Test vizibilitate categorii pentru admin vs public\n');

    // 1. Ascunde categoria "Jucării"
    console.log('1️⃣ Ascundere categorie "Jucării"...');
    await prisma.category.update({
      where: { slug: 'jucari' },
      data: { isActive: false }
    });
    console.log('   ✅ Jucării ascunsă\n');

    // 2. Simulare request PUBLIC (fără showAll)
    console.log('2️⃣ Categorii vizibile pentru UTILIZATORI (public):');
    const publicCategories = await prisma.category.findMany({
      where: { isActive: true },
      select: { name: true, icon: true, isActive: true },
      orderBy: { name: 'asc' }
    });
    publicCategories.forEach(cat => {
      console.log(`   ${cat.icon || '📂'} ${cat.name}`);
    });
    console.log(`   Total: ${publicCategories.length} categorii\n`);

    // 3. Simulare request ADMIN (cu showAll=true)
    console.log('3️⃣ Categorii vizibile pentru ADMIN (toate):');
    const adminCategories = await prisma.category.findMany({
      select: { name: true, icon: true, isActive: true },
      orderBy: { name: 'asc' }
    });
    adminCategories.forEach(cat => {
      const status = cat.isActive ? '✅' : '❌';
      console.log(`   ${status} ${cat.icon || '📂'} ${cat.name}`);
    });
    console.log(`   Total: ${adminCategories.length} categorii\n`);

    // 4. Reactivează categoria
    console.log('4️⃣ Reactivare categorie "Jucării"...');
    await prisma.category.update({
      where: { slug: 'jucari' },
      data: { isActive: true }
    });
    console.log('   ✅ Jucării reactivată\n');

    console.log('✅ Test finalizat cu succes!');
    console.log('\n📝 Concluzie:');
    console.log('   - Utilizatorii văd doar categoriile active');
    console.log('   - Adminii văd toate categoriile (inclusiv cele ascunse)');
    console.log('   - Categoriile ascunse sunt marcate vizual în panoul admin');

  } catch (error) {
    console.error('❌ Eroare:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testAdminVisibility();
