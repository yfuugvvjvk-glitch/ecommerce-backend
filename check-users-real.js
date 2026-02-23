const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  console.log('📋 Utilizatori în baza de date:\n');
  
  const users = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      role: true
    }
  });
  
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.role.toUpperCase()}: ${user.email} (${user.name})`);
  });
  
  console.log(`\n✅ Total: ${users.length} utilizatori`);
  
  await prisma.$disconnect();
}

checkUsers().catch(console.error);
