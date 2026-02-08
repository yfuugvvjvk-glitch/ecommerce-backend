import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class InvoiceSimpleService {
  // Generează număr factură simplu
  private generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `FAC-${year}${month}${day}-${random}`;
  }

  // Generează factură pentru comandă (simplu)
  async generateInvoiceForOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        orderItems: {
          include: {
            dataItem: true
          }
        }
      }
    });

    if (!order) {
      throw new Error('Comanda nu a fost găsită');
    }

    // Verifică dacă factura există deja
    if (order.invoiceNumber) {
      return order;
    }

    // Generează numărul facturii
    const invoiceNumber = this.generateInvoiceNumber();

    // Actualizează comanda cu numărul facturii
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        invoiceNumber,
        invoiceGenerated: true
      },
      include: {
        user: true,
        orderItems: {
          include: {
            dataItem: true
          }
        }
      }
    });

    console.log(`📄 Factură generată: ${invoiceNumber} pentru comanda ${orderId}`);
    return updatedOrder;
  }

  // Obține factura pentru o comandă
  async getInvoiceForOrder(orderId: string, userId: string) {
    const order = await prisma.order.findFirst({
      where: { 
        id: orderId,
        userId 
      },
      include: {
        user: true,
        orderItems: {
          include: {
            dataItem: true
          }
        }
      }
    });

    if (!order) {
      throw new Error('Comanda nu a fost găsită');
    }

    // Generează factura dacă nu există
    if (!order.invoiceNumber) {
      return await this.generateInvoiceForOrder(orderId);
    }

    return order;
  }

  // Admin: Obține factura pentru orice comandă (fără restricție de userId)
  async getInvoiceForOrderAdmin(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        orderItems: {
          include: {
            dataItem: true
          }
        }
      }
    });

    if (!order) {
      throw new Error('Comanda nu a fost găsită');
    }

    // Generează factura dacă nu există
    if (!order.invoiceNumber) {
      return await this.generateInvoiceForOrder(orderId);
    }

    return order;
  }

  // Obține toate facturile pentru un utilizator
  async getUserInvoices(userId: string) {
    return await prisma.order.findMany({
      where: { 
        userId,
        OR: [
          { invoiceGenerated: true },
          { invoiceNumber: { not: null } }
        ]
      },
      include: {
        orderItems: {
          include: {
            dataItem: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Admin: Obține toate facturile
  async getAllInvoices(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [invoices, total] = await Promise.all([
      prisma.order.findMany({
        where: { 
          OR: [
            { invoiceGenerated: true },
            { invoiceNumber: { not: null } }
          ]
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          orderItems: {
            include: {
              dataItem: {
                select: { id: true, title: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.order.count({ 
        where: { 
          OR: [
            { invoiceGenerated: true },
            { invoiceNumber: { not: null } }
          ]
        }
      })
    ]);

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Admin: Generează facturi pentru toate comenzile care nu au facturi
  async generateMissingInvoices() {
    // Găsește toate comenzile fără facturi
    const ordersWithoutInvoices = await prisma.order.findMany({
      where: {
        OR: [
          { invoiceNumber: null },
          { invoiceGenerated: false }
        ]
      },
      select: { id: true }
    });

    let generated = 0;
    const errors: string[] = [];

    for (const order of ordersWithoutInvoices) {
      try {
        await this.generateInvoiceForOrder(order.id);
        generated++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută';
        errors.push(`Eroare la comanda ${order.id}: ${errorMessage}`);
      }
    }

    return {
      total: ordersWithoutInvoices.length,
      generated,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  // Generează HTML pentru factură (pentru print)
  generateInvoiceHTML(order: any): string {
    const invoiceDate = new Date(order.createdAt).toLocaleDateString('ro-RO');
    const subtotal = order.orderItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    
    return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <title>Factură ${order.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
    .company-info { margin-bottom: 30px; }
    .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f5f5f5; font-weight: bold; }
    .totals { text-align: right; }
    .total-row { font-weight: bold; font-size: 1.2em; }
    .footer { margin-top: 50px; text-align: center; color: #666; font-size: 0.9em; }
    .print-buttons { text-align: center; margin: 20px 0; }
    .btn { padding: 10px 20px; margin: 0 10px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
    .btn-primary { background-color: #007bff; color: white; }
    .btn-secondary { background-color: #6c757d; color: white; }
    .btn:hover { opacity: 0.8; }
    @media print { 
      body { margin: 0; } 
      .print-buttons { display: none; }
    }
  </style>
  <script>
    function printInvoice() {
      window.print();
    }
    function closeWindow() {
      window.close();
    }
  </script>
</head>
<body>
  <div class="header">
    <h1>FACTURĂ</h1>
    <p>Nr. ${order.invoiceNumber}</p>
    <p>Data: ${invoiceDate}</p>
  </div>

  <div class="company-info">
    <h3>Furnizor:</h3>
    <p><strong>E-Commerce Shop SRL</strong></p>
    <p>Str. Exemplu Nr. 123, București, România</p>
    <p>CUI: RO12345678 | Reg. Com.: J40/1234/2024</p>
    <p>Email: contact@ecommerce.ro | Tel: +40 123 456 789</p>
  </div>

  <div class="invoice-details">
    <div>
      <h3>Client:</h3>
      <p><strong>${order.user.name}</strong></p>
      <p>${order.user.email}</p>
      <p>${order.shippingAddress}</p>
      ${order.deliveryPhone ? `<p>Tel: ${order.deliveryPhone}</p>` : ''}
    </div>
    <div>
      <h3>Detalii comandă:</h3>
      <p><strong>ID:</strong> ${order.id.slice(0, 8)}</p>
      <p><strong>Plată:</strong> ${order.paymentMethod === 'cash' ? 'Numerar' : order.paymentMethod === 'card' ? 'Card' : 'Transfer'}</p>
      <p><strong>Livrare:</strong> ${order.deliveryMethod === 'courier' ? 'Curier' : 'Ridicare'}</p>
      ${order.orderLocalTime ? `<p><strong>Timp plasare:</strong> ${order.orderLocalTime}</p>` : ''}
      ${order.orderLocation ? `<p><strong>Locație:</strong> ${order.orderLocation}</p>` : ''}
    </div>
  </div>

  <h3>Produse:</h3>
  <table>
    <thead>
      <tr>
        <th>Produs</th>
        <th>Preț unitar</th>
        <th>Cantitate</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${order.orderItems.map((item: any) => `
        <tr>
          <td>${item.dataItem.title}</td>
          <td>${item.price.toFixed(2)} RON</td>
          <td>${item.quantity}</td>
          <td>${(item.price * item.quantity).toFixed(2)} RON</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <strong>TOTAL: ${order.total.toFixed(2)} RON</strong>
    </div>
  </div>

  <div class="print-buttons">
    <button class="btn btn-primary" onclick="printInvoice()">🖨️ Imprimă Factura</button>
    <button class="btn btn-secondary" onclick="closeWindow()">❌ Închide</button>
  </div>

  <div class="footer">
    <p>Mulțumim pentru comandă!</p>
    <p>Pentru întrebări: contact@ecommerce.ro</p>
  </div>
</body>
</html>
    `;
  }

  // Duplică o factură
  async duplicateInvoice(orderId: string) {
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        orderItems: {
          include: {
            dataItem: true,
          },
        },
      },
    });

    if (!existingOrder) {
      throw new Error('Comanda nu a fost găsită');
    }

    // Creează o nouă comandă identică
    const newOrder = await prisma.order.create({
      data: {
        userId: existingOrder.userId,
        total: existingOrder.total,
        shippingAddress: existingOrder.shippingAddress,
        deliveryPhone: existingOrder.deliveryPhone,
        deliveryName: existingOrder.deliveryName,
        paymentMethod: existingOrder.paymentMethod,
        deliveryMethod: existingOrder.deliveryMethod,
        status: existingOrder.status,
        orderLocalTime: existingOrder.orderLocalTime,
        orderLocation: existingOrder.orderLocation,
        orderTimezone: existingOrder.orderTimezone,
        invoiceGenerated: true,
        invoiceNumber: `${existingOrder.invoiceNumber}-DUP-${Date.now()}`, // Număr duplicat
        orderItems: {
          create: existingOrder.orderItems.map(item => ({
            dataItemId: item.dataItemId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        user: true,
        orderItems: {
          include: {
            dataItem: true,
          },
        },
      },
    });

    return newOrder;
  }

  // Șterge o factură
  async deleteInvoice(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Comanda nu a fost găsită');
    }

    // Șterge comanda și toate datele asociate (cascade delete)
    await prisma.order.delete({
      where: { id: orderId },
    });

    return { message: 'Factură ștearsă cu succes' };
  }
}