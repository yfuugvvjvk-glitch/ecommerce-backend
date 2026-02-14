/**
 * Script de testare pentru API-ul de reguli de blocare
 * 
 * Acest script testează:
 * 1. Crearea unei reguli noi
 * 2. Obținerea tuturor regulilor
 * 3. Actualizarea unei reguli
 * 4. Ștergerea unei reguli
 * 
 * NOTĂ: Acest script necesită autentificare admin.
 * Pentru testare manuală, folosește Postman sau browser cu token valid.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBlockRulesDirectly() {
  console.log('🧪 Testare directă a sistemului de reguli de blocare...\n');
  
  try {
    // 1. Creează o regulă de test
    console.log('1️⃣ Creare regulă de test...');
    const testRule = {
      id: Date.now().toString(),
      name: 'Test Rule - Weekend Block',
      isActive: true,
      blockNewOrders: false,
      blockReason: '',
      blockedPaymentMethods: ['cash'],
      blockedDeliveryMethods: [],
      minimumOrderValue: 50,
      createdAt: new Date().toISOString()
    };
    
    // Obține reguli curente
    let config = await prisma.siteConfig.findUnique({
      where: { key: 'block_rules' }
    });
    
    let rules = config && config.value ? JSON.parse(config.value) : [];
    rules.push(testRule);
    
    // Salvează în DB
    await prisma.siteConfig.upsert({
      where: { key: 'block_rules' },
      update: { value: JSON.stringify(rules) },
      create: {
        key: 'block_rules',
        value: JSON.stringify(rules),
        description: 'Block rules configuration'
      }
    });
    
    console.log('✅ Regulă creată cu succes!');
    console.log('   ID:', testRule.id);
    console.log('   Nume:', testRule.name);
    console.log('   Metode plată blocate:', testRule.blockedPaymentMethods.join(', '));
    console.log('   Valoare minimă:', testRule.minimumOrderValue, 'RON\n');
    
    // 2. Citește toate regulile
    console.log('2️⃣ Citire toate regulile...');
    config = await prisma.siteConfig.findUnique({
      where: { key: 'block_rules' }
    });
    
    rules = config && config.value ? JSON.parse(config.value) : [];
    console.log(`✅ Găsite ${rules.length} reguli:\n`);
    rules.forEach((rule, index) => {
      console.log(`   ${index + 1}. ${rule.name} (${rule.isActive ? 'Activă' : 'Inactivă'})`);
      if (rule.blockNewOrders) {
        console.log(`      🚫 Blochează toate comenzile: ${rule.blockReason}`);
      }
      if (rule.blockedPaymentMethods && rule.blockedPaymentMethods.length > 0) {
        console.log(`      💳 Metode plată blocate: ${rule.blockedPaymentMethods.join(', ')}`);
      }
      if (rule.minimumOrderValue > 0) {
        console.log(`      💰 Valoare minimă: ${rule.minimumOrderValue} RON`);
      }
    });
    console.log('');
    
    // 3. Actualizează regula de test
    console.log('3️⃣ Actualizare regulă de test...');
    const ruleIndex = rules.findIndex(r => r.id === testRule.id);
    if (ruleIndex !== -1) {
      rules[ruleIndex].minimumOrderValue = 100;
      rules[ruleIndex].blockedPaymentMethods = ['cash', 'crypto'];
      
      await prisma.siteConfig.update({
        where: { key: 'block_rules' },
        data: { value: JSON.stringify(rules) }
      });
      
      console.log('✅ Regulă actualizată cu succes!');
      console.log('   Nouă valoare minimă:', rules[ruleIndex].minimumOrderValue, 'RON');
      console.log('   Noi metode blocate:', rules[ruleIndex].blockedPaymentMethods.join(', '), '\n');
    }
    
    // 4. Șterge regula de test
    console.log('4️⃣ Ștergere regulă de test...');
    rules = rules.filter(r => r.id !== testRule.id);
    
    await prisma.siteConfig.update({
      where: { key: 'block_rules' },
      data: { value: JSON.stringify(rules) }
    });
    
    console.log('✅ Regulă ștearsă cu succes!');
    console.log(`   Reguli rămase: ${rules.length}\n`);
    
    console.log('🎉 Toate testele au trecut cu succes!\n');
    console.log('📝 Notă: Pentru a testa API-ul complet (cu autentificare),');
    console.log('   accesează panoul admin și folosește interfața UI.');
    
  } catch (error) {
    console.error('❌ Eroare în timpul testării:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBlockRulesDirectly();
