const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCurrencies() {
  try {
    const count = await prisma.currency.count();
    console.log('Numar total monede:', count);
    
    const currencies = await prisma.currency.findMany();
    console.log('\nMonede in baza de date:');
    currencies.forEach(c => {
      console.log(`- ${c.code}: ${c.name} (${c.symbol}) - ${c.isActive ? 'ACTIVA' : 'INACTIVA'}`);
    });
    
    const rates = await prisma.exchangeRate.count();
    console.log(`\nCursuri de schimb: ${rates}`);
  } catch (error) {
    console.error('Eroare:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrencies();
