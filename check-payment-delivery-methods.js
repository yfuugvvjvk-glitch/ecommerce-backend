const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMethods() {
  console.log('🔍 Verificare metode de plată și livrare...\n');
  
  try {
    const paymentMethods = await prisma.paymentMethod.findMany();
    const deliverySettings = await prisma.deliverySettings.findMany();
    
    console.log('💳 Metode de Plată:');
    console.log(`Total: ${paymentMethods.length}\n`);
    paymentMethods.forEach((method, index) => {
      console.log(`${index + 1}. ${method.name}`);
      console.log(`   ID: ${method.id}`);
      console.log(`   Type: ${method.type || 'N/A'}`);
      console.log(`   Active: ${method.isActive ? 'Da' : 'Nu'}`);
      console.log('');
    });
    
    console.log('\n🚚 Metode de Livrare:');
    console.log(`Total: ${deliverySettings.length}\n`);
    deliverySettings.forEach((setting, index) => {
      console.log(`${index + 1}. ${setting.name}`);
      console.log(`   ID: ${setting.id}`);
      console.log(`   Type: ${setting.type || 'N/A'}`);
      console.log(`   Active: ${setting.isActive ? 'Da' : 'Nu'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMethods();
