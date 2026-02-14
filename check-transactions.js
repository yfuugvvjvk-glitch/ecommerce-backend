const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTransactions() {
  console.log('🔍 Verificare tranzacții în baza de date\n');
  
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: {
        date: 'desc'
      }
    });
    
    console.log(`📊 Total tranzacții: ${transactions.length}\n`);
    
    if (transactions.length === 0) {
      console.log('❌ Nu există tranzacții în baza de date');
      return;
    }
    
    transactions.forEach((tx, index) => {
      console.log(`${index + 1}. ${tx.name}`);
      console.log(`   ID: ${tx.id}`);
      console.log(`   Tip: ${tx.type}`);
      console.log(`   Categorie: ${tx.category}`);
      console.log(`   Sumă: ${tx.amount} RON`);
      console.log(`   Data: ${tx.date.toISOString()}`);
      console.log(`   Creat de: ${tx.createdById}`);
      console.log(`   Creat la: ${tx.createdAt.toISOString()}`);
      console.log('');
    });
    
    // Verifică perioada curentă
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    console.log(`📅 Perioada curentă (Lună):`);
    console.log(`   Start: ${startOfMonth.toISOString()}`);
    console.log(`   End: ${endOfMonth.toISOString()}\n`);
    
    const transactionsInPeriod = transactions.filter(tx => 
      tx.date >= startOfMonth && tx.date <= endOfMonth
    );
    
    console.log(`📊 Tranzacții în perioada curentă: ${transactionsInPeriod.length}`);
    
    if (transactionsInPeriod.length > 0) {
      const totalIncome = transactionsInPeriod
        .filter(tx => tx.type === 'INCOME')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const totalExpense = transactionsInPeriod
        .filter(tx => tx.type === 'EXPENSE')
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      
      console.log(`   💰 Venituri: ${totalIncome.toFixed(2)} RON`);
      console.log(`   💸 Cheltuieli: ${totalExpense.toFixed(2)} RON`);
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransactions();
