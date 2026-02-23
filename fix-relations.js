const fs = require('fs');
const path = require('path');

// Mapare relații camelCase -> PascalCase
const relationMap = {
  'user:': 'User:',
  'dataItem:': 'DataItem:',
  'category:': 'Category:',
  'order:': 'Order:',
  'orders:': 'Order:',
  'dataItems:': 'DataItem:',
  'product:': 'DataItem:',
  'products:': 'ProductOffer:',
  'members:': 'ChatRoomMember:',
  'voucher:': 'Voucher:',
  'userVouchers:': 'UserVoucher:',
  'stockMovements:': 'StockMovement:',
  'parent:': 'Category:',
  'subcategories:': 'Category:',
};

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix include relations
  for (const [wrong, correct] of Object.entries(relationMap)) {
    const regex = new RegExp(`include:\\s*\\{[^}]*\\b${wrong.replace(':', '')}:\\s*`, 'g');
    if (regex.test(content)) {
      content = content.replace(
        new RegExp(`\\b${wrong.replace(':', '')}:\\s*true`, 'g'),
        `${correct.replace(':', '')}: true`
      );
      content = content.replace(
        new RegExp(`\\b${wrong.replace(':', '')}:\\s*\\{`, 'g'),
        `${correct.replace(':', '')}: {`
      );
      modified = true;
    }
  }

  // Fix _count selects
  content = content.replace(/orders:\s*true/g, 'Order: true');
  content = content.replace(/dataItems:\s*true/g, 'DataItem: true');
  content = content.replace(/userVouchers:\s*true/g, 'UserVoucher: true');
  content = content.replace(/stockMovements:\s*true/g, 'StockMovement: true');

  if (modified || content !== fs.readFileSync(filePath, 'utf8')) {
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
