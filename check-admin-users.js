const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });
    
    console.log('👥 Total users found:', users.length);
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.name}) - Role: ${user.role}`);
    });
    
    if (users.length === 0) {
      console.log('\n⚠️  No admin users found!');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUsers();
