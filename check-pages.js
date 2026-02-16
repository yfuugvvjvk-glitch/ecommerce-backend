const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPages() {
  try {
    const pages = await prisma.page.findMany();
    console.log('Pagini gasite:', pages.length);
    console.log(JSON.stringify(pages, null, 2));
  } catch (error) {
    console.error('Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPages();
