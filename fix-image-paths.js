const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixImagePaths() {
  try {
    console.log('🔧 Actualizare căi imagini produse...');
    
    // Găsește toate produsele cu imagini în /images/
    const products = await prisma.product.findMany({
      where: {
        image: {
          startsWith: '/images/'
        }
      }
    });
    
    console.log(`📦 Găsite ${products.length} produse cu căi greșite`);
    
    // Actualizează fiecare produs
    for (const product of products) {
      const oldPath = product.image;
      // Extrage numele fișierului din calea veche
      const fileName = oldPath.split('/').pop();
      
      // Caută fișierul în uploads/media/
      const newPath = `/uploads/media/${fileName}`;
      
      await prisma.product.update({
        where: { id: product.id },
        data: { image: newPath }
      });
      
      console.log(`✅ ${product.title}: ${oldPath} → ${newPath}`);
    }
    
    console.log('\n✅ Toate căile au fost actualizate!');
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixImagePaths();
