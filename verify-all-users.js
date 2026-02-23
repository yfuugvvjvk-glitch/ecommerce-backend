const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyAllUsers() {
  try {
    console.log('🔄 Verificare utilizatori...');
    
    // Actualizează toți utilizatorii să aibă emailVerified = true
    const result = await prisma.user.updateMany({
      where: {
        emailVerified: false
      },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date()
      }
    });

    console.log(`✅ ${result.count} utilizatori au fost verificați`);
    
    // Afișează toți utilizatorii
    const users = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        role: true,
        emailVerified: true
      }
    });
    
    console.log('\n📋 Utilizatori în baza de date:');
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.name}) - Role: ${user.role} - Verified: ${user.emailVerified}`);
    });
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAllUsers();
