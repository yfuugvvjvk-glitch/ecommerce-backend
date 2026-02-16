const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deletePendingUser() {
  try {
    // Delete verification codes
    await prisma.verificationCode.deleteMany({
      where: {
        email: 'crys.cristi@yahoo.com'
      }
    });
    
    // Delete pending user
    await prisma.pendingUser.deleteMany({
      where: {
        email: 'crys.cristi@yahoo.com'
      }
    });
    
    console.log('✅ Deleted pending user and verification codes for crys.cristi@yahoo.com');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deletePendingUser();
