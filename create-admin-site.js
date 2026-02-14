const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createAdmin() {
  try {
    console.log('🔐 Creare cont admin@site.ro...\n');

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.upsert({
      where: { email: 'admin@site.ro' },
      update: {
        password: hashedPassword,
        role: 'admin',
      },
      create: {
        email: 'admin@site.ro',
        password: hashedPassword,
        name: 'Administrator Site',
        phone: '+40745000000',
        address: 'Galați, Romania',
        role: 'admin',
      },
    });

    console.log('✅ Cont admin creat cu succes!\n');
    console.log('📧 Email: admin@site.ro');
    console.log('🔑 Parolă: admin123');
    console.log('\n👤 Detalii cont:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Nume: ${admin.name}`);
    console.log(`   Rol: ${admin.role}`);
    console.log(`   Creat: ${admin.createdAt}`);

  } catch (error) {
    console.error('❌ Eroare:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

createAdmin();
