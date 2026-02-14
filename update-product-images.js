const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapare între numele produselor și imaginile reale
const imageMapping = {
  'gaina': '1770967058183-gaina(2).jpg',
  'ied': '1770967067950-iedut.jpg',
  'vitel': '1770967105966-vitel.jpg',
  'prepelita': '1770967534298-prepelita.jpg',
  'magari': '1770967084398-magari.jpeg',
  'locatie': '1770967074768-locatie.jpg'
};

async function updateProductImages() {
  try {
    console.log('🔧 Actualizare imagini produse cu imagini reale...');
    
    // Găsește toate produsele
    const products = await prisma.product.findMany();
    
    console.log(`📦 Găsite ${products.length} produse`);
    
    // Actualizează fiecare produs
    for (const product of products) {
      const title = product.title.toLowerCase();
      let newImagePath = null;
      
      // Caută în titlu pentru a găsi imaginea potrivită
      if (title.includes('pasăre') || title.includes('friptura de prepelita')) {
        newImagePath = `/uploads/media/${imageMapping.prepelita}`;
      } else if (title.includes('prepelita')) {
        newImagePath = `/uploads/media/${imageMapping.prepelita}`;
      } else if (title.includes('găină') || title.includes('gaina')) {
        newImagePath = `/uploads/media/${imageMapping.gaina}`;
      } else if (title.includes('vițel') || title.includes('vitel')) {
        newImagePath = `/uploads/media/${imageMapping.vitel}`;
      } else if (title.includes('ied')) {
        newImagePath = `/uploads/media/${imageMapping.ied}`;
      } else if (title.includes('măgăriță') || title.includes('magari')) {
        newImagePath = `/uploads/media/${imageMapping.magari}`;
      } else {
        // Pentru produse de lapte, brânză, etc. - folosim o imagine generică
        newImagePath = `/uploads/media/${imageMapping.locatie}`;
      }
      
      if (newImagePath && product.image !== newImagePath) {
        await prisma.product.update({
          where: { id: product.id },
          data: { image: newImagePath }
        });
        
        console.log(`✅ ${product.title}: ${product.image} → ${newImagePath}`);
      }
    }
    
    console.log('\n✅ Toate imaginile au fost actualizate cu imagini reale!');
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateProductImages();
