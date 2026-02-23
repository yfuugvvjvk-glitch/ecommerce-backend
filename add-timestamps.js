const fs = require('fs');
const path = require('path');

function addTimestamps(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Add updatedAt to Category.create
  content = content.replace(
    /(prisma\.category\.create\(\{\s*data:\s*\{[^}]*id:\s*crypto\.randomUUID\(\),[^}]*)(isActive:)/g,
    (match, p1, p2) => {
      if (!p1.includes('updatedAt:')) {
        return p1 + '\n          createdAt: new Date(),\n          updatedAt: new Date(),\n          ' + p2;
      }
      return match;
    }
  );

  // Add updatedAt to Transaction.create
  content = content.replace(
    /(prisma\.transaction\.create\(\{\s*data:\s*\{[^}]*id:\s*crypto\.randomUUID\(\),[^}]*)(createdById:)/g,
    (match, p1, p2) => {
      if (!p1.includes('updatedAt:')) {
        return p1 + '\n          createdAt: new Date(),\n          updatedAt: new Date(),\n          ' + p2;
      }
      return match;
    }
  );

  // Add updatedAt to Media.create
  content = content.replace(
    /(prisma\.media\.create\(\{\s*data:\s*\{[^}]*id:\s*crypto\.randomUUID\(\),[^}]*)(uploadedBy:)/g,
    (match, p1, p2) => {
      if (!p1.includes('updatedAt:')) {
        return p1 + '\n            createdAt: new Date(),\n            updatedAt: new Date(),\n            ' + p2;
      }
      return match;
    }
  );

  // Add updatedAt to DeliverySettings.create
  content = content.replace(
    /(prisma\.deliverySettings\.create\(\{\s*data:\s*\{[^}]*id:\s*crypto\.randomUUID\(\),[^}]*\})/g,
    (match) => {
      if (!match.includes('updatedAt:')) {
        return match.replace(/\}$/, ',\n        createdAt: new Date(),\n        updatedAt: new Date()\n      }');
      }
      return match;
    }
  );

  // Add updatedAt to PaymentMethod.create
  content = content.replace(
    /(prisma\.paymentMethod\.create\(\{\s*data:\s*\{[^}]*id:\s*crypto\.randomUUID\(\),[^}]*\})/g,
    (match) => {
      if (!match.includes('updatedAt:')) {
        return match.replace(/\}$/, ',\n        createdAt: new Date(),\n        updatedAt: new Date()\n      }');
      }
      return match;
    }
  );

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
      addTimestamps(filePath);
    }
  });
}

walkDir('./src');
console.log('Done!');
