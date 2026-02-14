const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOwnership() {
  const productId = 'cmlcol5gq000uu5bcilrgph49';
  
  console.log(`🔍 Verificare proprietar produs: ${productId}\n`);
  
  try {
    const product = await prisma.dataItem.findUnique({
      where: { id: productId },
      include: { user: { select: { id: true, email: true, role: true } } }
    });
    
    if (product) {
      console.log('📦 Produs:');
      console.log(`   Titlu: ${product.title}`);
      console.log(`   User ID: ${product.userId}`);
      console.log(`   Proprietar: ${product.user.email} (${product.user.role})`);
      
      // Găsește adminul
      const admin = await prisma.user.findFirst({
        where: { email: 'admin@site.ro' }
      });
      
      if (admin) {
        console.log(`\n👤 Admin curent:`);
        console.log(`   ID: ${admin.id}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Role: ${admin.role}`);
        
        if (product.userId === admin.id) {
          console.log('\n✅ Produsul aparține adminului curent');
        } else {
          console.log('\n❌ Produsul NU aparține adminului curent!');
          console.log(`   Produsul aparține: ${product.userId}`);
          console.log(`   Admin ID: ${admin.id}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOwnership();
