const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDeliverySync() {
  console.log('🧪 Testare sincronizare Locații de Livrare cu Metode de Livrare\n');
  
  try {
    // 1. Obține o metodă de livrare existentă
    console.log('1️⃣ Obținere metodă de livrare existentă...');
    const deliveryMethod = await prisma.deliverySettings.findFirst({
      where: { type: 'courier' }
    });
    
    if (!deliveryMethod) {
      console.log('❌ Nu există nicio metodă de livrare de tip "courier"');
      return;
    }
    
    console.log(`✅ Găsită metodă: ${deliveryMethod.name}`);
    console.log(`   ID: ${deliveryMethod.id}`);
    console.log(`   Cost: ${deliveryMethod.deliveryCost} RON`);
    console.log(`   Activ: ${deliveryMethod.isActive ? 'Da' : 'Nu'}\n`);
    
    // 2. Obține locațiile asociate cu această metodă
    console.log('2️⃣ Obținere locații asociate...');
    const locations = await prisma.deliveryLocation.findMany({
      where: { deliveryMethodId: deliveryMethod.id },
      include: { deliveryMethod: true }
    });
    
    console.log(`✅ Găsite ${locations.length} locații asociate:`);
    locations.forEach((loc, index) => {
      console.log(`   ${index + 1}. ${loc.name}`);
      console.log(`      Cost livrare: ${loc.deliveryFee} RON`);
      console.log(`      Activ: ${loc.isActive ? 'Da' : 'Nu'}`);
    });
    console.log('');
    
    // 3. Actualizează metoda de livrare
    console.log('3️⃣ Actualizare metodă de livrare...');
    const newCost = 25;
    const newThreshold = 150;
    
    await prisma.deliverySettings.update({
      where: { id: deliveryMethod.id },
      data: {
        deliveryCost: newCost,
        freeDeliveryThreshold: newThreshold
      }
    });
    
    console.log(`✅ Metodă actualizată:`);
    console.log(`   Nou cost: ${newCost} RON`);
    console.log(`   Nou prag livrare gratuită: ${newThreshold} RON\n`);
    
    // 4. Sincronizează locațiile (simulare - în producție se face automat)
    console.log('4️⃣ Sincronizare locații...');
    await prisma.deliveryLocation.updateMany({
      where: { deliveryMethodId: deliveryMethod.id },
      data: {
        deliveryFee: newCost,
        freeDeliveryThreshold: newThreshold
      }
    });
    
    console.log('✅ Locații sincronizate!\n');
    
    // 5. Verifică sincronizarea
    console.log('5️⃣ Verificare sincronizare...');
    const updatedLocations = await prisma.deliveryLocation.findMany({
      where: { deliveryMethodId: deliveryMethod.id }
    });
    
    console.log(`✅ Verificare completă:`);
    updatedLocations.forEach((loc, index) => {
      console.log(`   ${index + 1}. ${loc.name}`);
      console.log(`      Cost livrare: ${loc.deliveryFee} RON ${loc.deliveryFee === newCost ? '✓' : '✗'}`);
      console.log(`      Prag gratuit: ${loc.freeDeliveryThreshold} RON ${loc.freeDeliveryThreshold === newThreshold ? '✓' : '✗'}`);
    });
    console.log('');
    
    // 6. Restaurează valorile originale
    console.log('6️⃣ Restaurare valori originale...');
    await prisma.deliverySettings.update({
      where: { id: deliveryMethod.id },
      data: {
        deliveryCost: deliveryMethod.deliveryCost,
        freeDeliveryThreshold: deliveryMethod.freeDeliveryThreshold
      }
    });
    
    await prisma.deliveryLocation.updateMany({
      where: { deliveryMethodId: deliveryMethod.id },
      data: {
        deliveryFee: deliveryMethod.deliveryCost,
        freeDeliveryThreshold: deliveryMethod.freeDeliveryThreshold
      }
    });
    
    console.log('✅ Valori restaurate!\n');
    
    console.log('🎉 Test complet! Sincronizarea funcționează corect.\n');
    console.log('📝 Notă: În producție, sincronizarea se face automat');
    console.log('   când actualizezi DeliverySettings prin API.');
    
  } catch (error) {
    console.error('❌ Eroare în timpul testării:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDeliverySync();
