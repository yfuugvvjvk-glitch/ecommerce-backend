const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function cleanupUsers() {
  try {
    console.log('🧹 Începe curățarea utilizatorilor...');

    // 1. Găsește contul de administrator
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
      orderBy: { createdAt: 'asc' }, // Primul admin creat
    });

    if (!admin) {
      console.log('❌ Nu s-a găsit niciun administrator!');
      return;
    }

    console.log(`✅ Administrator găsit: ${admin.email}`);

    // 2. Găsește un client (user normal)
    const client = await prisma.user.findFirst({
      where: { 
        role: 'user',
        id: { not: admin.id }
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!client) {
      console.log('❌ Nu s-a găsit niciun client!');
      return;
    }

    console.log(`✅ Client găsit: ${client.email}`);

    // 3. Șterge toți ceilalți utilizatori
    const usersToKeep = [admin.id, client.id];
    
    const deleteResult = await prisma.user.deleteMany({
      where: {
        id: {
          notIn: usersToKeep,
        },
      },
    });

    console.log(`🗑️  Șterse ${deleteResult.count} conturi`);

    // 4. Creează contul de guest (vizitator)
    const hashedPassword = await bcrypt.hash('guest123', 10);
    
    const guest = await prisma.user.create({
      data: {
        email: 'guest@example.com',
        password: hashedPassword,
        name: 'Vizitator',
        role: 'user',
        phone: null,
        address: null,
        city: null,
        county: null,
        street: null,
        streetNumber: null,
        addressDetails: null,
        locale: 'ro',
      },
    });

    console.log(`✅ Cont guest creat: ${guest.email}`);
    console.log(`   Parolă: guest123`);

    // 5. Afișează rezumatul
    console.log('\n📊 Rezumat conturi:');
    console.log(`   1. Administrator: ${admin.email} (${admin.name})`);
    console.log(`   2. Client: ${client.email} (${client.name})`);
    console.log(`   3. Guest: ${guest.email} (${guest.name})`);
    console.log(`      Parolă guest: guest123`);

  } catch (error) {
    console.error('❌ Eroare:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupUsers();
