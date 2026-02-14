const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseStatus() {
  try {
    console.log('📊 Verificare status bază de date...\n');

    const users = await prisma.user.count();
    const products = await prisma.dataItem.count();
    const categories = await prisma.category.count();
    const orders = await prisma.order.count();
    const cartItems = await prisma.cartItem.count();

    console.log(`👥 Utilizatori: ${users}`);
    console.log(`📦 Produse: ${products}`);
    console.log(`📁 Categorii: ${categories}`);
    console.log(`🛒 Comenzi: ${orders}`);
    console.log(`🛍️  Items în coș: ${cartItems}`);

    if (products === 0) {
      console.log('\n⚠️  ATENȚIE: Nu există produse în baza de date!');
      console.log('Produsele au fost șterse odată cu utilizatorii din cauza relației Cascade.');
    }

  } catch (error) {
    console.error('❌ Eroare:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStatus();
