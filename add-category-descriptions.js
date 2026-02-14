const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function addDescriptions() {
  try {
    console.log('📝 Adăugare descrieri pentru categorii și subcategorii...\n');

    // Descrieri pentru categorii principale
    const mainCategories = [
      {
        slug: 'electronice',
        description: 'Descoperă cele mai noi tehnologii și gadgeturi electronice. De la laptopuri și telefoane la accesorii și tablete, avem tot ce ai nevoie pentru a fi conectat.'
      },
      {
        slug: 'fashion',
        description: 'Explorează colecția noastră de modă pentru bărbați, femei și copii. Haine elegante, casual și sportive pentru orice ocazie.'
      },
      {
        slug: 'casa',
        description: 'Tot ce ai nevoie pentru casa și grădina ta. Mobilier, decorațiuni, unelte și echipamente de grădinărit de calitate.'
      },
      {
        slug: 'sport',
        description: 'Echipamente și accesorii sportive pentru un stil de viață activ. Fitness, fotbal, baschet, ciclism și multe altele.'
      },
      {
        slug: 'jucari',
        description: 'Jucării educative și distractive pentru copii de toate vârstele. Dezvoltă creativitatea și imaginația copilului tău.'
      },
      {
        slug: 'carti',
        description: 'O colecție variată de cărți pentru toate gusturile. Romane, thriller-uri, cărți educative și multe altele.'
      }
    ];

    for (const cat of mainCategories) {
      await prisma.category.update({
        where: { slug: cat.slug },
        data: { description: cat.description }
      });
      console.log(`✅ Actualizat: ${cat.slug}`);
    }

    // Descrieri pentru subcategorii
    const subcategories = [
      // Electronice
      { slug: 'laptopuri', description: 'Laptopuri performante pentru muncă, gaming și uz personal. Branduri de top la prețuri competitive.' },
      { slug: 'telefoane', description: 'Cele mai noi smartphone-uri cu tehnologie de ultimă generație. Android și iOS.' },
      { slug: 'tablete', description: 'Tablete pentru productivitate și entertainment. Perfecte pentru școală sau relaxare.' },
      { slug: 'accesorii-electronice', description: 'Căști, încărcătoare, huse și alte accesorii pentru dispozitivele tale electronice.' },
      
      // Fashion
      { slug: 'fashion-barbati', description: 'Îmbrăcăminte și accesorii pentru bărbați. Stil modern și confort garantat.' },
      { slug: 'fashion-femei', description: 'Colecție elegantă de haine și accesorii pentru femei. De la casual la elegant.' },
      { slug: 'fashion-copii', description: 'Haine confortabile și colorate pentru copii. Calitate și durabilitate.' },
      { slug: 'incaltaminte', description: 'Pantofi, adidași și sandale pentru toată familia. Confort și stil.' },
      
      // Casă & Grădină
      { slug: 'mobilier', description: 'Mobilier de calitate pentru living, dormitor, bucătărie și birou.' },
      { slug: 'decoratiuni', description: 'Decorațiuni interioare și exterioare pentru a-ți personaliza spațiul.' },
      { slug: 'gradinarit', description: 'Unelte și echipamente pentru grădinărit. Transformă-ți grădina într-un paradis verde.' },
      { slug: 'unelte', description: 'Unelte profesionale și pentru uz casnic. Calitate și rezistență.' },
      
      // Sport
      { slug: 'fitness', description: 'Echipamente de fitness pentru antrenamente acasă sau la sală. Gantere, bănci, aparate.' },
      { slug: 'fotbal', description: 'Mingi, echipamente și accesorii pentru fotbal. Pentru amatori și profesioniști.' },
      { slug: 'baschet', description: 'Tot ce ai nevoie pentru baschet: mingi, coșuri, echipamente de protecție.' },
      { slug: 'ciclism', description: 'Biciclete, căști, accesorii și echipamente pentru ciclism.' }
    ];

    for (const subcat of subcategories) {
      try {
        await prisma.category.update({
          where: { slug: subcat.slug },
          data: { description: subcat.description }
        });
        console.log(`✅ Actualizat: ${subcat.slug}`);
      } catch (error) {
        console.log(`⚠️  Subcategoria ${subcat.slug} nu există`);
      }
    }

    console.log('\n📊 Afișare categorii cu descrieri:\n');
    
    const allCategories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        subcategories: {
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    for (const category of allCategories) {
      console.log(`\n📁 ${category.icon || '📂'} ${category.name}`);
      if (category.description) {
        console.log(`   📝 ${category.description.substring(0, 80)}...`);
      }
      
      if (category.subcategories.length > 0) {
        for (const subcat of category.subcategories) {
          console.log(`\n   └─ ${subcat.icon || '📄'} ${subcat.name}`);
          if (subcat.description) {
            console.log(`      📝 ${subcat.description.substring(0, 70)}...`);
          }
        }
      }
    }

    console.log('\n✅ Descrieri adăugate cu succes!');

  } catch (error) {
    console.error('❌ Eroare:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

addDescriptions();
