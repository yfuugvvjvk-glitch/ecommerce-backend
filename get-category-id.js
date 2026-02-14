const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.category.findFirst().then(c => {
  console.log(c.id);
  prisma.$disconnect();
});
