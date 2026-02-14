const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllStockIssues() {
  console.log('🔧 Verificare și corectare completă pentru toate produsele\n');
  
  try {
    // Găsește TOATE produsele
    const allProducts = await prisma.dataItem.findMany({
      select: {
        id: true,
        title: true,
        stock: true,
        reservedStock: true,
        availableStock: true,
        unitName: true
      }
    });
    
    console.log(`📦 Total produse găsite: ${allProducts.length}\n`);
    
    let issuesFound = 0;
    let fixed = 0;
    
    for (const product of allProducts) {
      const correctAvailableStock = product.stock - (product.reservedStock || 0);
      const hasNegativeReserved = product.reservedStock < 0;
      const hasWrongAvailable = Math.abs(product.availableStock - correctAvailableStock) > 0.001;
      
      if (hasNegativeReserved || hasWrongAvailable) {
        issuesFound++;
        
        console.log(`⚠️  ${product.title}`);
        console.log(`   Stock: ${product.stock} ${product.unitName}`);
        console.log(`   Reserved: ${product.reservedStock} ${product.unitName}${hasNegativeReserved ? ' ❌ NEGATIV' : ''}`);
        console.log(`   Available: ${product.availableStock} ${product.unitName}${hasWrongAvailable ? ' ❌ GREȘIT' : ''}`);
        console.log(`   → Ar trebui: Available = ${correctAvailableStock} ${product.unitName}`);
        
        // Corectăm
        const correctReservedStock = Math.max(0, product.reservedStock); // Nu permitem valori negative
        const newAvailableStock = product.stock - correctReservedStock;
        
        await prisma.dataItem.update({
          where: { id: product.id },
          data: {
            reservedStock: correctReservedStock,
            availableStock: newAvailableStock
          }
        });
        
        console.log(`   ✅ Corectat: Reserved = ${correctReservedStock}, Available = ${newAvailableStock}\n`);
        fixed++;
      }
    }
    
    if (issuesFound === 0) {
      console.log('✅ Nu s-au găsit probleme - toate produsele sunt corecte!');
    } else {
      console.log(`\n📊 Rezumat:`);
      console.log(`   Probleme găsite: ${issuesFound}`);
      console.log(`   Produse corectate: ${fixed}`);
      console.log(`   ✅ Toate problemele au fost rezolvate!`);
    }
    
    // Verificare finală
    console.log('\n🔍 Verificare finală...');
    const stillBroken = await prisma.dataItem.findMany({
      where: {
        OR: [
          { reservedStock: { lt: 0 } }
        ]
      }
    });
    
    if (stillBroken.length === 0) {
      console.log('✅ Verificare finală OK - nu mai există produse cu probleme!');
    } else {
      console.log(`❌ Încă există ${stillBroken.length} produse cu probleme!`);
      stillBroken.forEach(p => {
        console.log(`   - ${p.title}: Reserved = ${p.reservedStock}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllStockIssues();
