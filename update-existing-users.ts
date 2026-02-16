import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Actualizare utilizatori existenți...');

  // Actualizează toți utilizatorii existenți să fie verificați
  const result = await prisma.user.updateMany({
    where: {
      emailVerified: false,
    },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`✅ ${result.count} utilizatori au fost marcați ca verificați`);

  // Afișează toți utilizatorii
  const users = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      emailVerified: true,
      emailVerifiedAt: true,
    },
  });

  console.log('\n📋 Utilizatori în baza de date:');
  users.forEach((user) => {
    console.log(`  - ${user.email} (${user.name}) - Verificat: ${user.emailVerified ? '✅' : '❌'}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Eroare:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
