const fs = require('fs');
const path = require('path');

// Creează folderul images dacă nu există
const imagesDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log('✅ Folder /public/images/ creat');
}

// Creează imagini placeholder pentru produse
const placeholderImages = [
  'vaca0,5l.jpg',
  'vaca1l.jpg',
  'capra0,5l.jpg',
  'capra1l.jpg',
  'capra2l.jpg',
  'carenp.jpg',
  'carnep.jpg',
  'cas1kgv.jpg',
  'cas3kgv.jpg',
  'cas1kgc.jpg',
  'cas3kgc.jpg',
  'casmic1kgc.jpg',
  'casmic3kgc.jpg'
];

// Copiază o imagine placeholder pentru fiecare
const mediaDir = path.join(__dirname, 'public', 'uploads', 'media');
const mediaFiles = fs.readdirSync(mediaDir);

if (mediaFiles.length > 0) {
  const sourcePath = path.join(mediaDir, mediaFiles[0]);
  
  placeholderImages.forEach(imageName => {
    const destPath = path.join(imagesDir, imageName);
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Creat: ${imageName}`);
    }
  });
  
  console.log('\n✅ Toate imaginile placeholder au fost create!');
  console.log('💡 Acum poți înlocui aceste imagini cu cele reale din panoul admin.');
} else {
  console.log('❌ Nu există imagini în folderul media pentru a crea placeholder-uri');
}
