const fs = require('fs');
const path = require('path');

function addMissingFields(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix Category.create
  if (content.includes('prisma.category.create') && !content.match(/category\.create[^}]*id:\s*crypto/)) {
    content = content.replace(
      /(prisma\.category\.create\(\{\s*data:\s*\{)/g,
      (match) => {
        if (!content.includes('crypto.randomUUID()')) {
          return match + '\n          id: crypto.randomUUID(),';
        }
        return match;
      }
    );
    modified = true;
  }

  // Fix Transaction.create
  if (content.includes('prisma.transaction.create')) {
    content = content.replace(
      /(prisma\.transaction\.create\(\{\s*data:\s*\{[^}]*)(name:)/g,
      (match, p1, p2) => {
        if (!p1.includes('id:')) {
          return p1 + '\n          id: crypto.randomUUID(),\n          ' + p2;
        }
        return match;
      }
    );
    modified = true;
  }

  // Fix Media.create
  if (content.includes('prisma.media.create')) {
    content = content.replace(
      /(prisma\.media\.create\(\{\s*data:\s*\{[^}]*)(filename:)/g,
      (match, p1, p2) => {
        if (!p1.includes('id:')) {
          return p1 + '\n            id: crypto.randomUUID(),\n            ' + p2;
        }
        return match;
      }
    );
    modified = true;
  }

  // Fix Review.create in routes
  if (content.includes('prisma.review.create') && filePath.includes('routes')) {
    content = content.replace(
      /(prisma\.review\.create\(\{\s*data:\s*\{[^}]*)(userId:)/g,
      (match, p1, p2) => {
        if (!p1.includes('id:')) {
          return p1 + '\n          id: crypto.randomUUID(),\n          ' + p2;
        }
        return match;
      }
    );
    modified = true;
  }

  // Fix DeliverySettings.create
  if (content.includes('prisma.deliverySettings.create')) {
    content = content.replace(
      /(prisma\.deliverySettings\.create\(\{\s*data:\s*\{)/g,
      (match) => {
        return match + '\n        id: crypto.randomUUID(),';
      }
    );
    modified = true;
  }

  // Fix PaymentMethod.create
  if (content.includes('prisma.paymentMethod.create')) {
    content = content.replace(
      /(prisma\.paymentMethod\.create\(\{\s*data:\s*\{)/g,
      (match) => {
        return match + '\n        id: crypto.randomUUID(),';
      }
    );
    modified = true;
  }

  // Fix StockMovement.create without id
  content = content.replace(
    /(prisma\.stockMovement\.create\(\{\s*data:\s*\{)(\s*dataItemId:)/g,
    (match, p1, p2) => {
      if (!p1.includes('id:')) {
        return p1 + '\n            id: crypto.randomUUID(),' + p2;
      }
      return match;
    }
  );

  // Fix ProductOffer.createMany
  content = content.replace(
    /(productIds\.map\(\(productId: string\) => \(\{)(\s*offerId:)/g,
    '$1\n            id: crypto.randomUUID(),$2'
  );

  // Add crypto import if needed
  if (modified && !content.includes("import crypto from 'crypto'")) {
    content = "import crypto from 'crypto';\n" + content;
  }

  if (content !== fs.readFileSync(filePath, 'utf8')) {
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
      addMissingFields(filePath);
    }
  });
}

walkDir('./src');
console.log('Done!');
