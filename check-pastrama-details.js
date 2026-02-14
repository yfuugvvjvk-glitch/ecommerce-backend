const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPastramaDetails() {
  const productId = 'cmlkr0esl004du5l0wb5zomhi'; // Pastramă de capră
  
  console.log('🔍 Detalii pentru Pastramă de capră\n');
  
  try {
    // Obține detalii produs
    const product = await prisma.dataItem.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        stock: true,
        reservedStock: true,
        availableStock: true,
        totalSold: true,
        totalOrdered: true,
        unitName: true,
        trackInventory: true,
        updatedAt: true
      }
    });
    
    if (!product) {
      console.log('❌ Produsul nu a fost găsit');
      return;
    }
    
    console.log('📦 Detalii produs:');
    console.log(`   Titlu: ${product.title}`);
    console.log(`   Stock: ${product.stock} ${product.unitName}`);
    console.log(`   Reserved: ${product.reservedStock || 0} ${product.unitName}`);
    console.log(`   Available: ${product.availableStock || 0} ${product.unitName}`);
    console.log(`   Total Sold: ${product.totalSold || 0} ${product.unitName}`);
    console.log(`   Total Ordered: ${product.totalOrdered || 0} ${product.unitName}`);
    console.log(`   Track Inventory: ${product.trackInventory}`);
    console.log(`   Last Updated: ${product.updatedAt.toLocaleString('ro-RO')}`);
    console.log('');
    
    // Verifică comenzile recente
    console.log('📋 Comenzi recente (ultimele 10):\n');
    
    const orderItems = await prisma.orderItem.findMany({
      where: {
        dataItemId: productId
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            total: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        order: {
          createdAt: 'desc'
        }
      },
      take: 10
    });
    
    if (orderItems.length === 0) {
      console.log('   Nu există comenzi pentru acest produs');
    } else {
      orderItems.forEach((item, index) => {
        console.log(`${index + 1}. Order #${item.order.id.slice(-6)}`);
        console.log(`   Cantitate: ${item.quantity} ${product.unitName}`);
        console.log(`   Status: ${item.order.status}`);
        console.log(`   Data: ${item.order.createdAt.toLocaleString('ro-RO')}`);
        console.log(`   Client: ${item.order.user.name || item.order.user.email}`);
        console.log('');
      });
    }
    
    // Verifică mișcările de stoc
    console.log('📊 Mișcări de stoc (ultimele 10):\n');
    
    const movements = await prisma.stockMovement.findMany({
      where: {
        dataItemId: productId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    if (movements.length === 0) {
      console.log('   Nu există mișcări de stoc înregistrate');
    } else {
      movements.forEach((movement, index) => {
        console.log(`${index + 1}. ${movement.type}`);
        console.log(`   Cantitate: ${movement.quantity} ${product.unitName}`);
        console.log(`   Motiv: ${movement.reason}`);
        console.log(`   Data: ${movement.createdAt.toLocaleString('ro-RO')}`);
        if (movement.orderId) {
          console.log(`   Order ID: ${movement.orderId.slice(-6)}`);
        }
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPastramaDetails();
