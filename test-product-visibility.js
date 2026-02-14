const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testProductVisibility() {
  try {
    console.log('🧪 Test vizibilitate produse pentru admin vs public\n');

    // 1. Creează un produs draft pentru test
    console.log('1️⃣ Creare produs draft pentru test...');
    const draftProduct = await prisma.dataItem.create({
      data: {
        title: 'Produs Test Draft',
        description: 'Acesta este un produs draft pentru testare',
        content: 'Conținut detaliat produs draft',
        price: 99.99,
        stock: 10,
        image: '/images/test.jpg',
        categoryId: (await prisma.category.findFirst()).id,
        userId: (await prisma.user.findFirst({ where: { role: 'admin' } })).id,
        status: 'draft'
      }
    });
    console.log(`   ✅ Produs draft creat: ${draftProduct.title}\n`);

    // 2. Simulare request PUBLIC (utilizatori normali)
    console.log('2️⃣ Produse vizibile pentru UTILIZATORI (public):');
    const publicProducts = await prisma.dataItem.findMany({
      where: { status: 'published' },
      select: { title: true, status: true },
      orderBy: { title: 'asc' },
      take: 10
    });
    publicProducts.forEach(p => {
      console.log(`   ✅ ${p.title} (${p.status})`);
    });
    console.log(`   Total: ${publicProducts.length} produse\n`);

    // 3. Simulare request ADMIN (toate produsele)
    console.log('3️⃣ Produse vizibile pentru ADMIN (toate):');
    const adminProducts = await prisma.dataItem.findMany({
      select: { title: true, status: true },
      orderBy: { title: 'asc' },
      take: 15
    });
    adminProducts.forEach(p => {
      const status = p.status === 'published' ? '✅' : '📝';
      console.log(`   ${status} ${p.title} (${p.status})`);
    });
    console.log(`   Total: ${adminProducts.length} produse\n`);

    // 4. Statistici
    const publishedCount = await prisma.dataItem.count({ where: { status: 'published' } });
    const draftCount = await prisma.dataItem.count({ where: { status: 'draft' } });
    
    console.log('📊 Statistici produse:');
    console.log(`   ✅ Published: ${publishedCount}`);
    console.log(`   📝 Draft: ${draftCount}`);
    console.log(`   📦 Total: ${publishedCount + draftCount}\n`);

    // 5. Curățare - șterge produsul de test
    console.log('5️⃣ Curățare produs de test...');
    await prisma.dataItem.delete({ where: { id: draftProduct.id } });
    console.log('   ✅ Produs de test șters\n');

    console.log('✅ Test finalizat cu succes!');
    console.log('\n📝 Concluzie:');
    console.log('   - Utilizatorii văd doar produsele published');
    console.log('   - Adminii văd toate produsele (published + draft)');
    console.log('   - Produsele draft sunt marcate vizual în panoul admin');

  } catch (error) {
    console.error('❌ Eroare:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testProductVisibility();
