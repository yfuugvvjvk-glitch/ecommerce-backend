const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateExistingLocations() {
  console.log('🔄 Migrare locații existente către metode de livrare\n');
  
  try {
    // 1. Obține toate locațiile fără metodă de livrare
    console.log('1️⃣ Obținere locații fără metodă de livrare...');
    const locationsWithoutMethod = await prisma.deliveryLocation.findMany({
      where: { deliveryMethodId: null }
    });
    
    console.log(`✅ Găsite ${locationsWithoutMethod.length} locații fără metodă:\n`);
    
    if (locationsWithoutMethod.length === 0) {
      console.log('✅ Toate locațiile au deja o metodă de livrare asociată!');
      return;
    }
    
    // 2. Obține metodele de livrare disponibile
    console.log('2️⃣ Obținere metode de livrare disponibile...');
    const deliveryMethods = await prisma.deliverySettings.findMany({
      where: { isActive: true }
    });
    
    console.log(`✅ Găsite ${deliveryMethods.length} metode active:\n`);
    deliveryMethods.forEach((method, index) => {
      console.log(`   ${index + 1}. ${method.name} (${method.type})`);
    });
    console.log('');
    
    if (deliveryMethods.length === 0) {
      console.log('❌ Nu există metode de livrare active!');
      console.log('   Creează mai întâi o metodă de livrare în panoul admin.');
      return;
    }
    
    // 3. Asociază locațiile cu metode de livrare
    console.log('3️⃣ Asociere locații cu metode de livrare...\n');
    
    // Găsește metoda de tip "courier" (livrare standard)
    const courierMethod = deliveryMethods.find(m => m.type === 'courier');
    const pickupMethod = deliveryMethods.find(m => m.type === 'pickup');
    
    for (const location of locationsWithoutMethod) {
      // Determină metoda potrivită bazat pe numele locației
      let selectedMethod = courierMethod || deliveryMethods[0];
      
      if (location.name.toLowerCase().includes('ridicare') || 
          location.name.toLowerCase().includes('pickup')) {
        selectedMethod = pickupMethod || selectedMethod;
      }
      
      await prisma.deliveryLocation.update({
        where: { id: location.id },
        data: {
          deliveryMethodId: selectedMethod.id,
          // Sincronizează și valorile
          deliveryFee: selectedMethod.deliveryCost,
          freeDeliveryThreshold: selectedMethod.freeDeliveryThreshold
        }
      });
      
      console.log(`✅ ${location.name}`);
      console.log(`   → Asociat cu: ${selectedMethod.name}`);
      console.log(`   → Cost actualizat: ${selectedMethod.deliveryCost} RON`);
      console.log('');
    }
    
    // 4. Verificare finală
    console.log('4️⃣ Verificare finală...');
    const remainingWithoutMethod = await prisma.deliveryLocation.count({
      where: { deliveryMethodId: null }
    });
    
    const totalLocations = await prisma.deliveryLocation.count();
    const locationsWithMethod = totalLocations - remainingWithoutMethod;
    
    console.log(`✅ Migrare completă!`);
    console.log(`   Total locații: ${totalLocations}`);
    console.log(`   Cu metodă: ${locationsWithMethod}`);
    console.log(`   Fără metodă: ${remainingWithoutMethod}\n`);
    
    if (remainingWithoutMethod === 0) {
      console.log('🎉 Toate locațiile au fost migrate cu succes!');
    } else {
      console.log('⚠️ Unele locații nu au fost migrate. Verifică manual.');
    }
    
  } catch (error) {
    console.error('❌ Eroare în timpul migrării:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateExistingLocations();
