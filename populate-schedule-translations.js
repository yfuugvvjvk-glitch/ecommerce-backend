const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function populateScheduleTranslations() {
  try {
    console.log('🔄 Populare traduceri pentru programul de lucru...');

    // Găsește locația principală
    const mainLocation = await prisma.deliveryLocation.findFirst({
      where: { isMainLocation: true }
    });

    if (!mainLocation) {
      console.log('❌ Nu s-a găsit locația principală');
      return;
    }

    console.log('📍 Locație principală găsită:', mainLocation.name);

    // Programul în română (original)
    const scheduleRo = `Magazin fizic:
Luni - Joi: 9:00 - 18:00
Sâmbătă: 9:00 - 18:00
Magazin online: Non-stop`;

    // Traduceri pentru program
    const scheduleEn = `Physical store:
Monday - Thursday: 9:00 AM - 6:00 PM
Saturday: 9:00 AM - 6:00 PM
Online store: 24/7`;

    const scheduleFr = `Magasin physique:
Lundi - Jeudi: 9h00 - 18h00
Samedi: 9h00 - 18h00
Magasin en ligne: 24/7`;

    const scheduleDe = `Physisches Geschäft:
Montag - Donnerstag: 9:00 - 18:00 Uhr
Samstag: 9:00 - 18:00 Uhr
Online-Shop: 24/7`;

    const scheduleEs = `Tienda física:
Lunes - Jueves: 9:00 - 18:00
Sábado: 9:00 - 18:00
Tienda en línea: 24/7`;

    const scheduleIt = `Negozio fisico:
Lunedì - Giovedì: 9:00 - 18:00
Sabato: 9:00 - 18:00
Negozio online: 24/7`;

    // Actualizează locația cu traducerile
    await prisma.deliveryLocation.update({
      where: { id: mainLocation.id },
      data: {
        specialInstructions: scheduleRo,
        specialInstructionsEn: scheduleEn,
        specialInstructionsFr: scheduleFr,
        specialInstructionsDe: scheduleDe,
        specialInstructionsEs: scheduleEs,
        specialInstructionsIt: scheduleIt
      }
    });

    console.log('✅ Traduceri pentru program actualizate cu succes!');
    console.log('📋 Română:', scheduleRo);
    console.log('📋 Engleză:', scheduleEn);
    console.log('📋 Franceză:', scheduleFr);
    console.log('📋 Germană:', scheduleDe);
    console.log('📋 Spaniolă:', scheduleEs);
    console.log('📋 Italiană:', scheduleIt);

  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateScheduleTranslations();
