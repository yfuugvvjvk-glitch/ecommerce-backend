const fs = require('fs');
const path = require('path');

console.log('🔍 Testing media file access...\n');

// Test if files exist
const mediaDir = path.join(__dirname, 'public', 'uploads', 'media');
console.log(`📁 Media directory: ${mediaDir}`);
console.log(`📁 Directory exists: ${fs.existsSync(mediaDir)}`);

if (fs.existsSync(mediaDir)) {
  const files = fs.readdirSync(mediaDir);
  console.log(`\n📦 Found ${files.length} files in media directory`);
  console.log('\nFirst 5 files:');
  files.slice(0, 5).forEach(file => {
    const filePath = path.join(mediaDir, file);
    const stats = fs.statSync(filePath);
    console.log(`  - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
  });
}

// Test specific file from database
const testFile = '1771660910247-vaca.jpg';
const testPath = path.join(mediaDir, testFile);
console.log(`\n🔍 Testing specific file: ${testFile}`);
console.log(`📁 Full path: ${testPath}`);
console.log(`✅ File exists: ${fs.existsSync(testPath)}`);

if (fs.existsSync(testPath)) {
  const stats = fs.statSync(testPath);
  console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`📅 Modified: ${stats.mtime}`);
}

console.log('\n✅ Media access test complete!');
console.log('\n💡 If files exist but don\'t load in browser:');
console.log('   1. Make sure backend server is running (npm run dev)');
console.log('   2. Check CORS settings in backend');
console.log('   3. Try accessing directly: http://localhost:3001/uploads/media/1771660910247-vaca.jpg');
