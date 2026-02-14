const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function reactivate() {
  await prisma.category.updateMany({
    where: { isActive: false },
    data: { isActive: true }
  });
  console.log('✅ Toate categoriile reactivate');
  await prisma.$disconnect();
  await pool.end();
}

reactivate();
