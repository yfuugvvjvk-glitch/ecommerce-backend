const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function populateGiftRuleTranslations() {
  console.log('🎁 Populare traduceri pentru reguli de cadou\n');
  
  try {
    // Găsește regula "Comanda de peste 200 de lei"
    const rule = await prisma.giftRule.findFirst({
      where: {
        name: 'Comanda de peste 200 de lei'
      }
    });
    
    if (!rule) {
      console.log('❌ Nu s-a găsit regula "Comanda de peste 200 de lei"');
      return;
    }
    
    console.log(`✅ Găsită regula: ${rule.name} (ID: ${rule.id})\n`);
    
    // Actualizează cu traduceri
    const updated = await prisma.giftRule.update({
      where: { id: rule.id },
      data: {
        nameEn: 'Order over 200 lei',
        nameFr: 'Commande de plus de 200 lei',
        nameDe: 'Bestellung über 200 Lei',
        nameEs: 'Pedido de más de 200 lei',
        nameIt: 'Ordine superiore a 200 lei',
        descriptionEn: rule.description ? 'Get a free gift with orders over 200 lei' : null,
        descriptionFr: rule.description ? 'Recevez un cadeau gratuit pour les commandes de plus de 200 lei' : null,
        descriptionDe: rule.description ? 'Erhalten Sie ein kostenloses Geschenk bei Bestellungen über 200 Lei' : null,
        descriptionEs: rule.description ? 'Recibe un regalo gratis con pedidos de más de 200 lei' : null,
        descriptionIt: rule.description ? 'Ricevi un regalo gratuito con ordini superiori a 200 lei' : null,
      }
    });
    
    console.log('✅ Traduceri actualizate cu succes!\n');
    console.log('Traduceri:');
    console.log(`  🇷🇴 RO: ${updated.name}`);
    console.log(`  🇬🇧 EN: ${updated.nameEn}`);
    console.log(`  🇫🇷 FR: ${updated.nameFr}`);
    console.log(`  🇩🇪 DE: ${updated.nameDe}`);
    console.log(`  🇪🇸 ES: ${updated.nameEs}`);
    console.log(`  🇮🇹 IT: ${updated.nameIt}`);
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateGiftRuleTranslations();
