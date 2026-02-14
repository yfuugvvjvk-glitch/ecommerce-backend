const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testEvaluateGifts() {
  console.log('🧪 Test evaluare cadouri\n');
  
  try {
    // Găsește utilizatorul admin
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'admin' } },
          { name: { contains: 'Administrator' } },
          { role: 'admin' }
        ]
      }
    });
    if (!user) {
      console.log('❌ Nu există utilizatori admin în baza de date');
      console.log('Încerc cu primul user...');
      const firstUser = await prisma.user.findFirst();
      if (!firstUser) {
        console.log('❌ Nu există utilizatori');
        return;
      }
      user = firstUser;
    }
    
    console.log(`👤 User: ${user.name} (${user.email})\n`);
    
    // Găsește coșul utilizatorului
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: {
        dataItem: {
          select: {
            id: true,
            title: true,
            price: true,
            categoryId: true,
            stock: true
          }
        }
      }
    });
    
    console.log(`🛒 Produse în coș: ${cartItems.length}`);
    cartItems.forEach((item, i) => {
      console.log(`${i + 1}. ${item.dataItem.title} x${item.quantity} = ${item.dataItem.price * item.quantity} RON`);
    });
    
    const total = cartItems.reduce((sum, item) => sum + (item.dataItem.price * item.quantity), 0);
    console.log(`💰 Total coș: ${total} RON\n`);
    
    // Simulează evaluarea cadourilor
    const { CartService } = require('./src/services/cart.service.ts');
    const cartService = new CartService();
    
    console.log('🔍 Evaluare reguli de cadouri...\n');
    const eligibleRules = await cartService.getEligibleGifts(user.id);
    
    console.log(`✅ Reguli eligibile: ${eligibleRules.length}\n`);
    
    eligibleRules.forEach((eligible, i) => {
      console.log(`${i + 1}. ${eligible.rule.name}`);
      console.log(`   Descriere: ${eligible.rule.description || 'N/A'}`);
      console.log(`   Produse cadou disponibile: ${eligible.availableProducts.length}`);
      eligible.availableProducts.forEach((product, j) => {
        console.log(`   ${j + 1}. ${product.product.title} (${product.product.price} RON)`);
        console.log(`      Stoc: ${product.product.stock}`);
        console.log(`      Max per comandă: ${product.maxQuantityPerOrder}`);
      });
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Eroare:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testEvaluateGifts();
