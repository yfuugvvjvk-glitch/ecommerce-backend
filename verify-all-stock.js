const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAllStock() {
  console.log('🔍 Verificare completă stoc pentru toate produsele\n');
  
  try {
    const allProducts = await prisma.dataItem.findMany({
      select: {
        id: true,
        title: true,
        stock: true,
        reservedStock: true,
        availableStock: true,
        unitName: true
      },
      orderBy: {
        title: 'asc'
      }
    });
    
    console.log(`📦 Total produse: ${allProducts.length}\n`);
    
    let totalIssues = 0;
    let negativeReserved = 0;
    let wrongAvailable = 0;
    
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    for (const product of allProducts) {
      const correctAvailableStock = product.stock - (product.reservedStock || 0);
      const hasNegativeReserved = product.reservedStock < 0;
      const hasWrongAvailable = Math.abs(product.availableStock - correctAvailableStock) > 0.001;
      
      if (hasNegativeReserved || hasWrongAvailable) {
        totalIssues++;
        
        console.log(`❌ ${product.title}`);
        console.log(`   Stock: ${product.stock} ${product.unitName}`);
        
        if (hasNegativeReserved) {
          console.log(`   Reserved: ${product.reservedStock} ${product.unitName} ❌ NEGATIV`);
          negativeReserved++;
        } else {
          console.log(`   Reserved: ${product.reservedStock} ${product.unitName}`);
        }
        
        if (hasWrongAvailable) {
          console.log(`   Available: ${product.availableStock} ${product.unitName} ❌ GREȘIT (ar trebui ${correctAvailableStock})`);
          wrongAvailable++;
        } else {
          console.log(`   Available: ${product.availableStock} ${product.unitName}`);
        }
        
        console.log('');
      }
    }
    
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (totalIssues === 0) {
      console.log('✅ PERFECT! Toate produsele au stocul corect!');
      console.log('   - Niciun reservedStock negativ');
      console.log('   - Toate valorile availableStock sunt corecte');
      console.log('   - Toate unitățile (kg, litri, bucăți) sunt OK\n');
    } else {
      console.log(`⚠️  PROBLEME GĂSITE: ${totalIssues} produse`);
      if (negativeReserved > 0) {
        console.log(`   - ${negativeReserved} produse cu reservedStock negativ`);
      }
      if (wrongAvailable > 0) {
        console.log(`   - ${wrongAvailable} produse cu availableStock greșit`);
      }
      console.log('\n💡 Rulează: node fix-all-stock-issues.js pentru a corecta\n');
    }
    
    // Statistici generale
    console.log('📊 Statistici generale:');
    const totalStock = allProducts.reduce((sum, p) => sum + p.stock, 0);
    const totalReserved = allProducts.reduce((sum, p) => sum + p.reservedStock, 0);
    const totalAvailable = allProducts.reduce((sum, p) => sum + p.availableStock, 0);
    
    console.log(`   Total stoc: ${totalStock.toFixed(2)}`);
    console.log(`   Total rezervat: ${totalReserved.toFixed(2)}`);
    console.log(`   Total disponibil: ${totalAvailable.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAllStock();
