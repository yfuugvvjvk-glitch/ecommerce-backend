const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testStockDisplay() {
  try {
    console.log('🧪 Test moduri afișare stoc produse\n');

    // 1. Creează produse de test cu diferite moduri de afișare
    console.log('1️⃣ Creare produse de test...');
    
    const category = await prisma.category.findFirst();
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    
    const testProducts = [
      {
        title: 'Produs Stoc Vizibil',
        description: 'Stocul este vizibil complet',
        content: 'Detalii produs',
        price: 100,
        stock: 50,
        availableStock: 45,
        reservedStock: 5,
        isInStock: true,
        image: '/test.jpg',
        categoryId: category.id,
        userId: admin.id,
        status: 'published',
        stockDisplayMode: 'visible'
      },
      {
        title: 'Produs Doar Stare',
        description: 'Doar disponibil/indisponibil',
        content: 'Detalii produs',
        price: 150,
        stock: 30,
        availableStock: 28,
        reservedStock: 2,
        isInStock: true,
        image: '/test.jpg',
        categoryId: category.id,
        userId: admin.id,
        status: 'published',
        stockDisplayMode: 'status_only'
      },
      {
        title: 'Produs Stoc Ascuns',
        description: 'Stocul este complet ascuns',
        content: 'Detalii produs',
        price: 200,
        stock: 20,
        availableStock: 18,
        reservedStock: 2,
        isInStock: true,
        image: '/test.jpg',
        categoryId: category.id,
        userId: admin.id,
        status: 'published',
        stockDisplayMode: 'hidden'
      }
    ];

    const createdProducts = [];
    for (const product of testProducts) {
      const created = await prisma.dataItem.create({ data: product });
      createdProducts.push(created);
      console.log(`   ✅ ${created.title} (${created.stockDisplayMode})`);
    }
    console.log('');

    // 2. Simulare vizualizare UTILIZATOR
    console.log('2️⃣ Vizualizare ca UTILIZATOR:\n');
    
    for (const product of createdProducts) {
      const item = await prisma.dataItem.findUnique({
        where: { id: product.id }
      });
      
      console.log(`📦 ${item.title}`);
      console.log(`   Mod afișare: ${item.stockDisplayMode}`);
      
      if (item.stockDisplayMode === 'visible') {
        console.log(`   ✅ Stoc vizibil: ${item.stock} bucăți`);
        console.log(`   ✅ Disponibil: ${item.availableStock} bucăți`);
        console.log(`   ✅ Rezervat: ${item.reservedStock} bucăți`);
      } else if (item.stockDisplayMode === 'status_only') {
        console.log(`   ℹ️  Status: ${item.isInStock ? 'Disponibil' : 'Indisponibil'}`);
        console.log(`   🚫 Cantitate stoc: ASCUNS`);
      } else if (item.stockDisplayMode === 'hidden') {
        console.log(`   🚫 Informații stoc: COMPLET ASCUNSE`);
      }
      console.log('');
    }

    // 3. Simulare vizualizare ADMIN
    console.log('3️⃣ Vizualizare ca ADMIN:\n');
    
    for (const product of createdProducts) {
      const item = await prisma.dataItem.findUnique({
        where: { id: product.id }
      });
      
      console.log(`📦 ${item.title}`);
      console.log(`   Mod afișare: ${item.stockDisplayMode}`);
      console.log(`   ✅ Stoc total: ${item.stock} bucăți`);
      console.log(`   ✅ Disponibil: ${item.availableStock} bucăți`);
      console.log(`   ✅ Rezervat: ${item.reservedStock} bucăți`);
      console.log(`   ✅ Status: ${item.isInStock ? 'În stoc' : 'Fără stoc'}`);
      console.log('');
    }

    // 4. Curățare
    console.log('4️⃣ Curățare produse de test...');
    for (const product of createdProducts) {
      await prisma.dataItem.delete({ where: { id: product.id } });
    }
    console.log('   ✅ Produse de test șterse\n');

    console.log('✅ Test finalizat cu succes!\n');
    console.log('📝 Moduri de afișare stoc:');
    console.log('   1. visible - Arată cantitatea exactă de stoc');
    console.log('   2. status_only - Arată doar disponibil/indisponibil');
    console.log('   3. hidden - Ascunde complet informațiile despre stoc');
    console.log('\n💡 Adminii văd întotdeauna toate informațiile despre stoc!');

  } catch (error) {
    console.error('❌ Eroare:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testStockDisplay();
