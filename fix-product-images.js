const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixImages() {
  try {
    console.log('🖼️  Actualizare imagini produse...\n');
    
    const imageMap = {
      'Laptop': '/images/laptop.jpg',
      'Căștile de gaming': '/images/casti.jpg',
      'Cămașă de bărbați': '/images/camasa.jpg',
      'Rochie Guess': '/images/rochie.jpg',
      'Mașină De Tuns Gazon': '/images/masina.jpg',
      'Despicător de busteni': '/images/despicator.jpg',
      'Set gantere reglabile': '/images/gantere.jpg',
      'Bicicletă': '/images/bicicleta.jpg',
      'MoYu RS3M 2020': '/images/cub.jpg',
      'Chiriașa': '/images/chiriasa.jpg',
      'Bancă de exerciții reglabilă': '/images/banca.jpg',
      'Soarele negru': '/images/soare.jpg'
    };
    
    for (const [title, image] of Object.entries(imageMap)) {
      const result = await prisma.dataItem.updateMany({
        where: { title },
        data: { image }
      });
      
      if (result.count > 0) {
        console.log(`✅ ${title} -> ${image}`);
      }
    }
    
    console.log('\n✨ Imagini actualizate cu succes!');
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixImages();
