const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Fix specific wrong capitalizations back to correct ones
  // DataItem relations should use lowercase
  content = content.replace(/include:\s*\{\s*Category:\s*true/g, 'include: { category: true');
  content = content.replace(/include:\s*\{\s*DataItem:\s*true/g, 'include: { dataItem: true');
  
  // OrderInclude should use lowercase 'user'
  content = content.replace(/(OrderInclude[^}]*)\bUser:\s*\{/g, '$1user: {');
  content = content.replace(/(OrderInclude[^}]*)\bUser:\s*true/g, '$1user: true');
  
  // Fix _count selects - these should use PascalCase
  content = content.replace(/_count:\s*\{\s*select:\s*\{\s*orders:\s*true/g, '_count: { select: { Order: true');
  content = content.replace(/_count:\s*\{\s*select:\s*\{\s*dataItems:\s*true/g, '_count: { select: { DataItem: true');
  content = content.replace(/_count:\s*\{\s*select:\s*\{\s*userVouchers:\s*true/g, '_count: { select: { UserVoucher: true');
  content = content.replace(/_count:\s*\{\s*select:\s*\{\s*stockMovements:\s*true/g, '_count: { select: { StockMovement: true');
  content = content.replace(/_count:\s*\{\s*select:\s*\{\s*reviews:\s*true/g, '_count: { select: { Review: true');
  content = content.replace(/_count:\s*\{\s*select:\s*\{\s*favorites:\s*true/g, '_count: { select: { Favorite: true');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.ts')) {
      fixFile(filePath);
    }
  });
}

walkDir('./src');
console.log('Done!');
