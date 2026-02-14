const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGiftRules() {
  console.log('🎁 Verificare reguli de cadouri\n');
  
  try {
    // Găsește toate regulile de cadouri
    const rules = await prisma.giftRule.findMany({
      include: {
        conditions: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true
              }
            },
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        giftProducts: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                stock: true
              }
            }
          }
        }
      }
    });
    
    console.log(`📋 Total reguli: ${rules.length}\n`);
    
    rules.forEach((rule, index) => {
      console.log(`${index + 1}. ${rule.name}`);
      console.log(`   ID: ${rule.id}`);
      console.log(`   Activ: ${rule.isActive ? '✅' : '❌'}`);
      console.log(`   Prioritate: ${rule.priority}`);
      console.log(`   Logică condiții: ${rule.conditionLogic}`);
      
      if (rule.validFrom) {
        console.log(`   Valid de la: ${rule.validFrom.toLocaleString('ro-RO')}`);
      }
      if (rule.validUntil) {
        console.log(`   Valid până la: ${rule.validUntil.toLocaleString('ro-RO')}`);
      }
      
      console.log(`\n   Condiții (${rule.conditions.length}):`);
      rule.conditions.forEach((cond, i) => {
        console.log(`   ${i + 1}. Tip: ${cond.type}`);
        if (cond.minAmount) console.log(`      Sumă minimă: ${cond.minAmount} RON`);
        if (cond.productId) console.log(`      Produs: ${cond.product?.title}`);
        if (cond.minQuantity) console.log(`      Cantitate minimă: ${cond.minQuantity}`);
        if (cond.categoryId) console.log(`      Categorie: ${cond.category?.name}`);
        if (cond.minCategoryAmount) console.log(`      Sumă minimă categorie: ${cond.minCategoryAmount} RON`);
      });
      
      console.log(`\n   Produse cadou (${rule.giftProducts.length}):`);
      rule.giftProducts.forEach((gift, i) => {
        console.log(`   ${i + 1}. ${gift.product.title}`);
        console.log(`      Preț: ${gift.product.price} RON`);
        console.log(`      Stoc: ${gift.product.stock}`);
        console.log(`      Max per comandă: ${gift.maxQuantityPerOrder}`);
      });
      
      console.log(`\n   Utilizări:`);
      console.log(`      Curente: ${rule.currentTotalUses}`);
      if (rule.maxTotalUses) console.log(`      Maxime totale: ${rule.maxTotalUses}`);
      if (rule.maxUsesPerCustomer) console.log(`      Maxime per client: ${rule.maxUsesPerCustomer}`);
      
      console.log('\n' + '='.repeat(60) + '\n');
    });
    
    // Verifică dacă există reguli active
    const activeRules = rules.filter(r => r.isActive);
    console.log(`\n✅ Reguli active: ${activeRules.length}`);
    
    if (activeRules.length === 0) {
      console.log('\n⚠️ NU EXISTĂ REGULI ACTIVE! Activează o regulă pentru a testa sistemul de cadouri.');
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGiftRules();
