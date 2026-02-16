const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const translations = {
  'Card Bancar': {
    en: 'Bank Card',
    fr: 'Carte Bancaire',
    de: 'Bankkarte',
    es: 'Tarjeta Bancaria',
    it: 'Carta Bancaria'
  },
  'Numerar la Livrare': {
    en: 'Cash on Delivery',
    fr: 'Paiement à la livraison',
    de: 'Barzahlung bei Lieferung',
    es: 'Pago contra reembolso',
    it: 'Pagamento alla consegna'
  },
  'Plată cu cardul bancar (Visa, MasterCard)': {
    en: 'Pay with bank card (Visa, MasterCard)',
    fr: 'Payer par carte bancaire (Visa, MasterCard)',
    de: 'Mit Bankkarte bezahlen (Visa, MasterCard)',
    es: 'Pagar con tarjeta bancaria (Visa, MasterCard)',
    it: 'Paga con carta bancaria (Visa, MasterCard)'
  },
  'Plată în numerar la primirea comenzii': {
    en: 'Cash payment upon order receipt',
    fr: 'Paiement en espèces à la réception de la commande',
    de: 'Barzahlung bei Erhalt der Bestellung',
    es: 'Pago en efectivo al recibir el pedido',
    it: 'Pagamento in contanti alla ricezione dell\'ordine'
  }
};

async function populateTranslations() {
  try {
    console.log('🔄 Populating payment method translations...');
    
    const methods = await prisma.paymentMethod.findMany();
    
    console.log(`Found ${methods.length} payment methods`);
    
    for (const method of methods) {
      console.log(`\nProcessing: ${method.name}`);
      
      const nameTranslations = translations[method.name];
      const descTranslations = method.description ? translations[method.description] : null;
      
      if (nameTranslations) {
        await prisma.paymentMethod.update({
          where: { id: method.id },
          data: {
            nameEn: nameTranslations.en,
            nameFr: nameTranslations.fr,
            nameDe: nameTranslations.de,
            nameEs: nameTranslations.es,
            nameIt: nameTranslations.it,
            descriptionEn: descTranslations?.en || null,
            descriptionFr: descTranslations?.fr || null,
            descriptionDe: descTranslations?.de || null,
            descriptionEs: descTranslations?.es || null,
            descriptionIt: descTranslations?.it || null
          }
        });
        console.log(`  ✅ Updated translations`);
      } else {
        console.log(`  ⚠️ No translations found`);
      }
    }
    
    console.log('\n✅ All payment method translations populated!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateTranslations();
