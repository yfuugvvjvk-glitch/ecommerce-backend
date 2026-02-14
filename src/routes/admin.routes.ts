import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { adminSettingsService } from '../services/admin-settings.service';
import { advancedProductService } from '../services/advanced-product.service';
import { pageService } from '../services/page.service';
import { deliveryLocationService } from '../services/delivery-location.service';
import { siteConfigService } from '../services/site-config.service';
import { financialReportService } from '../services/financial-report.service';
import { OrderService } from '../services/order.service';
import { uiElementService } from '../services/ui-element.service';

const orderService = new OrderService();

// Tipuri pentru programe de livrare
interface DeliveryTimeSlot {
  startTime: string;
  endTime: string;
  maxOrders: number;
}

interface SpecialDate {
  date: string;
  isBlocked: boolean;
  reason?: string;
}

interface DeliverySchedule {
  id: string;
  name: string;
  deliveryDays: number[];
  deliveryTimeSlots: DeliveryTimeSlot[];
  isActive: boolean;
  blockOrdersAfter: string;
  advanceOrderDays: number;
  specialDates: SpecialDate[];
}

// Mock storage pentru programe de livrare (în producție ar fi în baza de date)
let deliverySchedules: DeliverySchedule[] = [
  {
    id: '1',
    name: 'Program Standard',
    deliveryDays: [1, 2, 3, 4, 5], // Luni-Vineri
    deliveryTimeSlots: [
      { startTime: '09:00', endTime: '12:00', maxOrders: 5 },
      { startTime: '14:00', endTime: '18:00', maxOrders: 8 }
    ],
    isActive: true,
    blockOrdersAfter: '20:00',
    advanceOrderDays: 1,
    specialDates: []
  }
];

// Helper function to get user ID from request
const getUserId = (request: any): string => {
  const userId = request.user?.userId || request.user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return userId;
};

export async function adminRoutes(fastify: FastifyInstance) {
  // Aplicăm middleware-ul de autentificare și admin pentru toate rutele
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', adminMiddleware);

  // === STATISTICI ===
  fastify.get('/stats', async (request, reply) => {
    try {
      const stats = await adminSettingsService.getAdminStats();
      reply.send(stats);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // === GESTIONARE UTILIZATORI ===
  fastify.get('/users', async (request, reply) => {
    try {
      const { page = 1, limit = 10 } = request.query as any;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const [users, total] = await Promise.all([
        adminSettingsService.getAllUsers(skip, limitNum),
        adminSettingsService.getUsersCount()
      ]);

      reply.send({
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  fastify.get('/users/:userId/details', async (request, reply) => {
    try {
      const { userId } = request.params as any;
      const userDetails = await adminSettingsService.getUserDetails(userId);
      reply.send(userDetails);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  fastify.put('/users/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any;
      const updateData = request.body as any;
      const updatedUser = await adminSettingsService.updateUser(userId, updateData);
      reply.send(updatedUser);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  fastify.put('/users/:userId/role', async (request, reply) => {
    try {
      const { userId } = request.params as any;
      const { role } = request.body as any;
      const updatedUser = await adminSettingsService.updateUser(userId, { role });
      reply.send(updatedUser);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  fastify.delete('/users/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any;
      await adminSettingsService.deleteUser(userId);
      reply.send({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Generate temporary password for user
  fastify.post('/users/:userId/generate-temp-password', async (request, reply) => {
    try {
      const { userId } = request.params as any;
      const result = await adminSettingsService.generateTemporaryPassword(userId);
      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // === GESTIONARE COMENZI ===
  fastify.get('/orders', async (request, reply) => {
    try {
      const { status, page = 1, limit = 10 } = request.query as any;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const [orders, total] = await Promise.all([
        adminSettingsService.getAllOrders(status, skip, limitNum),
        adminSettingsService.getOrdersCount(status)
      ]);

      reply.send({
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  fastify.put('/orders/:orderId', async (request, reply) => {
    try {
      const { orderId } = request.params as any;
      const updateData = request.body as any;
      const updatedOrder = await adminSettingsService.updateOrder(orderId, updateData);
      reply.send(updatedOrder);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Actualizează statusul unei comenzi și stocul produselor
  fastify.put('/orders/:orderId/status', async (request, reply) => {
    try {
      const { orderId } = request.params as any;
      const { status } = request.body as any;
      
      const updatedOrder = await adminSettingsService.updateOrder(orderId, { status });
      
      // Dacă comanda este livrată, actualizează stocul produselor
      if (status === 'DELIVERED') {
        await adminSettingsService.updateStockAfterDelivery(orderId);
      }
      
      // Dacă comanda este anulată, eliberează stocul rezervat
      if (status === 'CANCELLED') {
        await adminSettingsService.releaseReservedStock(orderId);
      }
      
      reply.send(updatedOrder);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  fastify.delete('/orders/:orderId', async (request, reply) => {
    try {
      const { orderId } = request.params as any;
      await adminSettingsService.deleteOrder(orderId);
      reply.send({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // === GESTIONARE VOUCHERE ===
  fastify.get('/vouchers', async (request, reply) => {
    try {
      const { page = 1, limit = 10 } = request.query as any;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const [vouchers, total] = await Promise.all([
        adminSettingsService.getAllVouchers(skip, limitNum),
        adminSettingsService.getVouchersCount()
      ]);

      reply.send({
        vouchers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  fastify.post('/vouchers', async (request, reply) => {
    try {
      const voucherData = request.body as any;
      // Add the user ID from the authenticated request
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send({ error: 'User not authenticated' });
      }
      const voucher = await adminSettingsService.createVoucher({
        ...voucherData,
        createdById: userId
      });
      reply.code(201).send(voucher);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  fastify.put('/vouchers/:voucherId', async (request, reply) => {
    try {
      const { voucherId } = request.params as any;
      const updateData = request.body as any;
      const voucher = await adminSettingsService.updateVoucher(voucherId, updateData);
      reply.send(voucher);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  fastify.delete('/vouchers/:voucherId', async (request, reply) => {
    try {
      const { voucherId } = request.params as any;
      await adminSettingsService.deleteVoucher(voucherId);
      reply.send({ success: true, message: 'Voucher deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  fastify.get('/voucher-requests', async (request, reply) => {
    try {
      const requests = await adminSettingsService.getAllVoucherRequests();
      reply.send(requests);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  fastify.post('/voucher-requests/:requestId/approve', async (request, reply) => {
    try {
      const { requestId } = request.params as any;
      const result = await adminSettingsService.updateVoucherRequest(requestId, 'APPROVED');
      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  fastify.post('/voucher-requests/:requestId/reject', async (request, reply) => {
    try {
      const { requestId } = request.params as any;
      const result = await adminSettingsService.updateVoucherRequest(requestId, 'REJECTED');
      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  fastify.post('/voucher-requests/:requestId/reset', async (request, reply) => {
    try {
      const { requestId } = request.params as any;
      const result = await adminSettingsService.updateVoucherRequest(requestId, 'PENDING');
      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  fastify.put('/voucher-requests/:requestId', async (request, reply) => {
    try {
      const { requestId } = request.params as any;
      const updateData = request.body as any;
      const result = await adminSettingsService.updateVoucherRequestData(requestId, updateData);
      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  fastify.delete('/voucher-requests/:requestId', async (request, reply) => {
    try {
      const { requestId } = request.params as any;
      await adminSettingsService.deleteVoucherRequest(requestId);
      reply.send({ success: true, message: 'Voucher request deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // === GESTIONARE OFERTE ===
  fastify.get('/offers', async (request, reply) => {
    try {
      const offers = await adminSettingsService.getAllOffers();
      reply.send(offers);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  fastify.post('/offers', async (request, reply) => {
    try {
      const offerData = request.body as any;
      const userId = getUserId(request);
      const offer = await adminSettingsService.createOffer({
        ...offerData,
        createdById: userId
      });
      reply.code(201).send(offer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  fastify.post('/offers/upload-image', async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      // Simple file handling - in production, use proper file storage
      const filename = `offer-${Date.now()}-${data.filename}`;
      const imagePath = `/images/offers/${filename}`;
      
      // Return the path for now - in production, save the actual file
      reply.send({ imagePath });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  fastify.put('/offers/:offerId', async (request, reply) => {
    try {
      const { offerId } = request.params as any;
      const updateData = request.body as any;
      const offer = await adminSettingsService.updateOffer(offerId, updateData);
      reply.send(offer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  fastify.delete('/offers/:offerId', async (request, reply) => {
    try {
      const { offerId } = request.params as any;
      await adminSettingsService.deleteOffer(offerId);
      reply.send({ success: true, message: 'Offer deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // === DASHBOARD ===
  fastify.get('/dashboard', async (request, reply) => {
    try {
      const dashboard = await adminSettingsService.getAdminDashboard();
      reply.send(dashboard);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // === GESTIONARE STOC ===
  
  // Obține statistici de stoc
  fastify.get('/stock/statistics', async (request, reply) => {
    try {
      const { productId } = request.query as any;
      const statistics = await advancedProductService.getStockStatistics(productId);
      reply.send(statistics);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Adaugă stoc
  fastify.post('/stock/add', async (request, reply) => {
    try {
      const { productId, quantity, reason } = request.body as any;
      
      if (!productId || !quantity || quantity <= 0) {
        return reply.code(400).send({ error: 'Product ID and positive quantity are required' });
      }

      await advancedProductService.addStock(productId, quantity, reason || 'Manual stock addition', request.user!.userId);
      reply.send({ success: true, message: 'Stock added successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Raport de stoc
  fastify.get('/stock/report', async (request, reply) => {
    try {
      const filters = request.query as any;
      const report = await adminSettingsService.getStockReport(filters);
      reply.send(report);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Marchează produse expirate
  fastify.post('/stock/mark-expired', async (request, reply) => {
    try {
      await advancedProductService.markExpiredProducts();
      reply.send({ success: true, message: 'Expired products marked successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // === SETĂRI PRODUSE ===

  // Setează produs ca perisabil
  fastify.put('/products/:productId/perishable', async (request, reply) => {
    try {
      const { productId } = request.params as any;
      const perishableData = request.body as any;
      
      const updated = await adminSettingsService.setProductPerishable(productId, perishableData);
      reply.send(updated);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Setează perioada de comandă în avans
  fastify.put('/products/:productId/advance-order', async (request, reply) => {
    try {
      const { productId } = request.params as any;
      const advanceData = request.body as any;
      
      const updated = await adminSettingsService.setProductAdvanceOrder(productId, advanceData);
      reply.send(updated);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Setează unități de măsură
  fastify.put('/products/:productId/units', async (request, reply) => {
    try {
      const { productId } = request.params as any;
      const unitData = request.body as any;
      
      const updated = await adminSettingsService.setProductUnits(productId, unitData);
      reply.send(updated);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Setează reguli de livrare pentru produs
  fastify.put('/products/:productId/delivery-rules', async (request, reply) => {
    try {
      const { productId } = request.params as any;
      const deliveryRules = request.body as any;
      
      const updated = await adminSettingsService.setProductDeliveryRules(productId, deliveryRules);
      reply.send(updated);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Actualizare în masă a produselor
  fastify.put('/products/bulk-update', async (request, reply) => {
    try {
      const { productIds, updates } = request.body as any;
      
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return reply.code(400).send({ error: 'Product IDs array is required' });
      }

      const results = await adminSettingsService.bulkUpdateProducts(productIds, updates);
      reply.send(results);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // === SETĂRI DE LIVRARE ===

  // Obține setările de livrare
  fastify.get('/delivery-settings', async (request, reply) => {
    try {
      const { activeOnly } = request.query as any;
      const settings = await adminSettingsService.getDeliverySettings(activeOnly === 'true');
      reply.send(settings);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Creează setări de livrare
  fastify.post('/delivery-settings', async (request, reply) => {
    try {
      const data = request.body as any;
      const settings = await adminSettingsService.createDeliverySettings(data);
      reply.code(201).send(settings);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Actualizează setări de livrare
  fastify.put('/delivery-settings/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = request.body as any;
      const settings = await adminSettingsService.updateDeliverySettings(id, data);
      reply.send(settings);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Șterge setări de livrare
  fastify.delete('/delivery-settings/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      await adminSettingsService.deleteDeliverySettings(id);
      reply.send({ success: true, message: 'Delivery settings deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // === METODE DE PLATĂ ===

  // Obține metodele de plată
  fastify.get('/payment-methods', async (request, reply) => {
    try {
      const { activeOnly } = request.query as any;
      const methods = await adminSettingsService.getPaymentMethods(activeOnly === 'true');
      reply.send(methods);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Creează metodă de plată
  fastify.post('/payment-methods', async (request, reply) => {
    try {
      const data = request.body as any;
      const method = await adminSettingsService.createPaymentMethod(data);
      reply.code(201).send(method);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Actualizează metodă de plată
  fastify.put('/payment-methods/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = request.body as any;
      const method = await adminSettingsService.updatePaymentMethod(id, data);
      reply.send(method);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Șterge metodă de plată
  fastify.delete('/payment-methods/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      await adminSettingsService.deletePaymentMethod(id);
      reply.send({ success: true, message: 'Payment method deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // === GESTIONARE PAGINI REALE ===

  // Obține toate paginile
  fastify.get('/content/pages', async (request, reply) => {
    try {
      const pages = await pageService.getAllPages();
      reply.send(pages);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Obține o pagină specifică
  fastify.get('/content/pages/:pageId', async (request, reply) => {
    try {
      const { pageId } = request.params as any;
      const page = await pageService.getPageById(pageId);
      
      if (!page) {
        return reply.code(404).send({ error: 'Page not found' });
      }
      
      reply.send(page);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Creează pagină nouă
  fastify.post('/content/pages', async (request, reply) => {
    try {
      const pageData = request.body as any;
      const userId = getUserId(request);
      const page = await pageService.createPage({
        ...pageData,
        createdById: userId
      });
      
      reply.code(201).send(page);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Actualizează pagină
  fastify.put('/content/pages/:pageId', async (request, reply) => {
    try {
      const { pageId } = request.params as any;
      const updateData = request.body as any;
      
      const page = await pageService.updatePage(pageId, updateData);
      reply.send(page);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Șterge pagină
  fastify.delete('/content/pages/:pageId', async (request, reply) => {
    try {
      const { pageId } = request.params as any;
      await pageService.deletePage(pageId);
      reply.send({ success: true, message: 'Page deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Publică/depublică pagină
  fastify.post('/content/pages/:pageId/toggle-publication', async (request, reply) => {
    try {
      const { pageId } = request.params as any;
      const page = await pageService.togglePagePublication(pageId);
      reply.send(page);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Gestionare secțiuni pagină
  fastify.post('/content/pages/:pageId/sections', async (request, reply) => {
    try {
      const { pageId } = request.params as any;
      const sectionData = request.body as any;
      
      const section = await pageService.addPageSection(pageId, sectionData);
      reply.code(201).send(section);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  fastify.put('/content/sections/:sectionId', async (request, reply) => {
    try {
      const { sectionId } = request.params as any;
      const updateData = request.body as any;
      
      const section = await pageService.updatePageSection(sectionId, updateData);
      reply.send(section);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  fastify.delete('/content/sections/:sectionId', async (request, reply) => {
    try {
      const { sectionId } = request.params as any;
      await pageService.deletePageSection(sectionId);
      reply.send({ success: true, message: 'Section deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Reordonează secțiuni
  fastify.put('/content/pages/:pageId/sections/reorder', async (request, reply) => {
    try {
      const { pageId } = request.params as any;
      const { sectionIds } = request.body as any;
      
      await pageService.reorderPageSections(pageId, sectionIds);
      reply.send({ success: true, message: 'Sections reordered successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Upload media
  fastify.post('/content/upload', async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      // Simple file handling - în producție, folosește storage adecvat
      const filename = `media-${Date.now()}-${data.filename}`;
      const mediaPath = `/uploads/media/${filename}`;
      
      // În producție, salvează fișierul efectiv
      reply.send({ mediaPath, filename });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // === GESTIONARE CONFIGURAȚII SITE ===

  // Obține toate configurațiile
  fastify.get('/site-config', async (request, reply) => {
    try {
      const configs = await siteConfigService.getAllConfigs();
      reply.send(configs);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Obține o configurație specifică
  fastify.get('/site-config/:key', async (request, reply) => {
    try {
      const { key } = request.params as any;
      const config = await siteConfigService.getConfig(key);
      
      if (!config) {
        return reply.code(404).send({ error: 'Configuration not found' });
      }
      
      reply.send(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Setează o configurație
  fastify.put('/site-config/:key', async (request, reply) => {
    try {
      const { key } = request.params as any;
      const { value, type, description, isPublic } = request.body as any;
      
      const config = await siteConfigService.setConfig(key, value, {
        type,
        description,
        isPublic,
        updatedById: request.user!.userId
      });
      
      reply.send(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Setează configurații în masă
  fastify.put('/site-config', async (request, reply) => {
    try {
      const { configs } = request.body as any;
      
      const results = await siteConfigService.setBulkConfigs(configs, request.user!.userId);
      reply.send(results);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Șterge o configurație
  fastify.delete('/site-config/:key', async (request, reply) => {
    try {
      const { key } = request.params as any;
      await siteConfigService.deleteConfig(key);
      reply.send({ success: true, message: 'Configuration deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Inițializează configurațiile implicite
  fastify.post('/site-config/initialize', async (request, reply) => {
    try {
      const result = await siteConfigService.initializeDefaultConfigs();
      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // === ANNOUNCEMENT BANNER ===

  // Obține configurația banner-ului de anunțuri
  fastify.get('/announcement-banner', async (request, reply) => {
    try {
      const config = await siteConfigService.getConfig('announcement_banner');
      
      // Dacă nu există configurație, returnează valorile implicite
      if (!config) {
        const defaultConfig = {
          isActive: false,
          title: '',
          description: '',
          titleStyle: {
            color: '#000000',
            backgroundColor: '#FFFFFF',
            fontSize: 24,
            fontFamily: 'Arial',
            fontWeight: 'bold',
            textAlign: 'center'
          },
          descriptionStyle: {
            color: '#333333',
            backgroundColor: '#F9FAFB',
            fontSize: 16,
            fontFamily: 'Arial',
            fontWeight: 'normal',
            textAlign: 'left'
          }
        };
        
        reply.send({ success: true, data: defaultConfig });
        return;
      }
      
      reply.send({ success: true, data: config.value });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ success: false, error: { code: 'SERVER_ERROR', message: errorMessage } });
    }
  });

  // Actualizează configurația banner-ului de anunțuri
  fastify.put('/announcement-banner', async (request, reply) => {
    try {
      const config = request.body as any;
      
      // Validare server-side
      const errors: string[] = [];
      
      // Validare titlu
      if (typeof config.title !== 'string') {
        errors.push('Title must be a string');
      } else if (config.title.length > 200) {
        errors.push('Title cannot exceed 200 characters');
      }
      
      // Validare descriere
      if (typeof config.description !== 'string') {
        errors.push('Description must be a string');
      } else if (config.description.length > 1000) {
        errors.push('Description cannot exceed 1000 characters');
      }
      
      // Validare culori (format hex)
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
      
      if (!config.titleStyle?.color || !hexColorRegex.test(config.titleStyle.color)) {
        errors.push('Invalid title color format (must be #RRGGBB or #RRGGBBAA)');
      }
      if (!config.titleStyle?.backgroundColor || !hexColorRegex.test(config.titleStyle.backgroundColor)) {
        errors.push('Invalid title background color format (must be #RRGGBB or #RRGGBBAA)');
      }
      if (!config.descriptionStyle?.color || !hexColorRegex.test(config.descriptionStyle.color)) {
        errors.push('Invalid description color format (must be #RRGGBB or #RRGGBBAA)');
      }
      if (!config.descriptionStyle?.backgroundColor || !hexColorRegex.test(config.descriptionStyle.backgroundColor)) {
        errors.push('Invalid description background color format (must be #RRGGBB or #RRGGBBAA)');
      }
      
      // Validare mărime font titlu (12-48px)
      if (typeof config.titleStyle?.fontSize !== 'number' || 
          config.titleStyle.fontSize < 12 || 
          config.titleStyle.fontSize > 48) {
        errors.push('Title font size must be between 12 and 48 pixels');
      }
      
      // Validare mărime font descriere (12-32px)
      if (typeof config.descriptionStyle?.fontSize !== 'number' || 
          config.descriptionStyle.fontSize < 12 || 
          config.descriptionStyle.fontSize > 32) {
        errors.push('Description font size must be between 12 and 32 pixels');
      }
      
      // Validare font family
      const validFontFamilies = ['Arial', 'Times New Roman', 'Courier', 'Georgia', 'Verdana', 'Helvetica', 'Comic Sans MS', 'Impact', 'Trebuchet MS'];
      if (!validFontFamilies.includes(config.titleStyle?.fontFamily)) {
        errors.push('Invalid title font family');
      }
      if (!validFontFamilies.includes(config.descriptionStyle?.fontFamily)) {
        errors.push('Invalid description font family');
      }
      
      // Validare font weight
      const validFontWeights = ['normal', 'bold', 'light'];
      if (!validFontWeights.includes(config.titleStyle?.fontWeight)) {
        errors.push('Invalid title font weight (must be normal, bold, or light)');
      }
      if (!validFontWeights.includes(config.descriptionStyle?.fontWeight)) {
        errors.push('Invalid description font weight (must be normal, bold, or light)');
      }
      
      // Validare text align
      const validTextAligns = ['left', 'center', 'right'];
      if (!validTextAligns.includes(config.titleStyle?.textAlign)) {
        errors.push('Invalid title text alignment (must be left, center, or right)');
      }
      if (!validTextAligns.includes(config.descriptionStyle?.textAlign)) {
        errors.push('Invalid description text alignment (must be left, center, or right)');
      }
      
      // Validare isActive
      if (typeof config.isActive !== 'boolean') {
        errors.push('isActive must be a boolean');
      }
      
      // Dacă există erori, returnează 400
      if (errors.length > 0) {
        return reply.code(400).send({ 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Validation failed', 
            details: errors 
          } 
        });
      }
      
      // Salvează configurația
      const userId = getUserId(request);
      const updatedConfig = await siteConfigService.setConfig(
        'announcement_banner',
        config,
        {
          type: 'json',
          description: 'Announcement banner configuration',
          isPublic: true,
          updatedById: userId
        }
      );
      
      // WebSocket broadcast este deja gestionat de siteConfigService.setConfig()
      
      reply.send({ success: true, data: updatedConfig.value });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ success: false, error: { code: 'SERVER_ERROR', message: errorMessage } });
    }
  });

  // === PROGRAME DE LIVRARE ===
  
  // In-memory storage pentru programe de livrare (persistent în timpul rulării serverului)
  let deliverySchedules = [
    {
      id: '1',
      name: 'Program Standard',
      deliveryDays: [1, 2, 3, 4, 5], // Luni-Vineri
      deliveryTimeSlots: [
        { startTime: '09:00', endTime: '12:00', maxOrders: 5 },
        { startTime: '14:00', endTime: '18:00', maxOrders: 8 }
      ],
      isActive: true,
      blockOrdersAfter: '20:00',
      advanceOrderDays: 1,
      specialDates: []
    }
  ];

  // Obține toate programele de livrare
  fastify.get('/delivery-schedules', async (request, reply) => {
    try {
      // Încearcă să obții din baza de date
      const config = await siteConfigService.getConfig('delivery_schedules');
      
      if (config && config.value) {
        const schedules = JSON.parse(config.value as string);
        reply.send(schedules);
      } else {
        // Returnează și salvează valorile implicite
        await siteConfigService.setConfig('delivery_schedules', JSON.stringify(deliverySchedules), { description: 'Delivery schedules configuration' });
        reply.send(deliverySchedules);
      }
    } catch (error) {
      console.error('Error loading delivery schedules:', error);
      reply.send(deliverySchedules);
    }
  });

  // Creează program de livrare
  fastify.post('/delivery-schedules', async (request, reply) => {
    try {
      const scheduleData = request.body as any;
      
      const newSchedule = {
        id: Date.now().toString(),
        ...scheduleData,
        specialDates: scheduleData.specialDates || []
      };

      // Obține schedules curente din DB
      const config = await siteConfigService.getConfig('delivery_schedules');
      let schedules = config && config.value ? JSON.parse(config.value as string) : deliverySchedules;
      
      schedules.push(newSchedule);
      
      // Salvează în DB
      await siteConfigService.setConfig('delivery_schedules', JSON.stringify(schedules), { description: 'Delivery schedules configuration' });
      
      reply.code(201).send(newSchedule);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Actualizează program de livrare
  fastify.put('/delivery-schedules/:scheduleId', async (request, reply) => {
    try {
      const { scheduleId } = request.params as any;
      const scheduleData = request.body as any;
      
      // Obține schedules curente din DB
      const config = await siteConfigService.getConfig('delivery_schedules');
      let schedules = config && config.value ? JSON.parse(config.value as string) : deliverySchedules;
      
      const scheduleIndex = schedules.findIndex((s: any) => s.id === scheduleId);
      if (scheduleIndex === -1) {
        reply.code(404).send({ error: 'Schedule not found' });
        return;
      }

      const updatedSchedule = {
        id: scheduleId,
        ...scheduleData
      };

      schedules[scheduleIndex] = updatedSchedule;
      
      // Salvează în DB
      await siteConfigService.setConfig('delivery_schedules', JSON.stringify(schedules), { description: 'Delivery schedules configuration' });
      
      reply.send(updatedSchedule);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Adaugă dată specială la program
  fastify.post('/delivery-schedules/:scheduleId/special-dates', async (request, reply) => {
    try {
      const { scheduleId } = request.params as any;
      const specialDateData = request.body as SpecialDate;
      
      // Obține schedules din DB
      const config = await siteConfigService.getConfig('delivery_schedules');
      let schedules = config && config.value ? JSON.parse(config.value as string) : deliverySchedules;
      
      const schedule = schedules.find((s: any) => s.id === scheduleId);
      if (!schedule) {
        reply.code(404).send({ error: 'Schedule not found' });
        return;
      }

      schedule.specialDates.push(specialDateData);
      
      // Salvează în DB
      await siteConfigService.setConfig('delivery_schedules', JSON.stringify(schedules), { description: 'Delivery schedules configuration' });
      
      reply.send({ success: true, message: 'Special date added successfully', schedule });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Șterge dată specială din program
  fastify.delete('/delivery-schedules/:scheduleId/special-dates/:dateIndex', async (request, reply) => {
    try {
      const { scheduleId, dateIndex } = request.params as any;
      
      // Obține schedules din DB
      const config = await siteConfigService.getConfig('delivery_schedules');
      let schedules = config && config.value ? JSON.parse(config.value as string) : deliverySchedules;
      
      const schedule = schedules.find((s: any) => s.id === scheduleId);
      if (!schedule) {
        reply.code(404).send({ error: 'Schedule not found' });
        return;
      }

      const index = parseInt(dateIndex);
      if (index < 0 || index >= schedule.specialDates.length) {
        reply.code(404).send({ error: 'Special date not found' });
        return;
      }

      schedule.specialDates.splice(index, 1);
      
      // Salvează în DB
      await siteConfigService.setConfig('delivery_schedules', JSON.stringify(schedules), { description: 'Delivery schedules configuration' });
      
      reply.send({ success: true, message: 'Special date deleted successfully', schedule });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Șterge program de livrare
  fastify.delete('/delivery-schedules/:scheduleId', async (request, reply) => {
    try {
      const { scheduleId } = request.params as any;
      
      // Obține schedules din DB
      const config = await siteConfigService.getConfig('delivery_schedules');
      let schedules = config && config.value ? JSON.parse(config.value as string) : deliverySchedules;
      
      const scheduleIndex = schedules.findIndex((s: any) => s.id === scheduleId);
      if (scheduleIndex === -1) {
        reply.code(404).send({ error: 'Schedule not found' });
        return;
      }

      schedules.splice(scheduleIndex, 1);
      
      // Salvează în DB
      await siteConfigService.setConfig('delivery_schedules', JSON.stringify(schedules), { description: 'Delivery schedules configuration' });
      
      reply.send({ success: true, message: 'Schedule deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Obține setările de blocare comenzi
  fastify.get('/order-block-settings', async (request, reply) => {
    try {
      const settings = await orderService.getOrderBlockSettings();
      reply.send(settings);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Actualizează setările de blocare comenzi
  fastify.put('/order-block-settings', async (request, reply) => {
    try {
      const blockSettings = request.body as any;
      console.log('Received block settings:', blockSettings);
      
      if (!blockSettings) {
        return reply.code(400).send({ error: 'Block settings are required' });
      }
      
      const updatedSettings = await orderService.updateOrderBlockSettings(blockSettings);
      console.log('Updated settings:', updatedSettings);
      reply.send(updatedSettings);
    } catch (error) {
      console.error('Error updating block settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // === GESTIONARE REGULI DE BLOCARE (MULTIPLE) ===

  // Obține toate regulile de blocare
  fastify.get('/block-rules', async (request, reply) => {
    try {
      const config = await siteConfigService.getConfig('block_rules');
      const rules = config && config.value ? JSON.parse(config.value as string) : [];
      reply.send(rules);
    } catch (error) {
      console.error('Error loading block rules:', error);
      reply.send([]);
    }
  });

  // Creează regulă de blocare
  fastify.post('/block-rules', async (request, reply) => {
    try {
      const ruleData = request.body as any;
      
      const newRule = {
        id: Date.now().toString(),
        ...ruleData,
        createdAt: new Date().toISOString()
      };

      // Obține reguli curente
      const config = await siteConfigService.getConfig('block_rules');
      let rules = config && config.value ? JSON.parse(config.value as string) : [];
      
      rules.push(newRule);
      
      // Salvează în DB
      await siteConfigService.setConfig('block_rules', JSON.stringify(rules), { description: 'Block rules configuration' });
      
      reply.code(201).send(newRule);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Actualizează regulă de blocare
  fastify.put('/block-rules/:ruleId', async (request, reply) => {
    try {
      const { ruleId } = request.params as any;
      const ruleData = request.body as any;
      
      // Obține reguli curente
      const config = await siteConfigService.getConfig('block_rules');
      let rules = config && config.value ? JSON.parse(config.value as string) : [];
      
      const ruleIndex = rules.findIndex((r: any) => r.id === ruleId);
      if (ruleIndex === -1) {
        reply.code(404).send({ error: 'Rule not found' });
        return;
      }

      const updatedRule = {
        ...rules[ruleIndex],
        ...ruleData,
        id: ruleId
      };

      rules[ruleIndex] = updatedRule;
      
      // Salvează în DB
      await siteConfigService.setConfig('block_rules', JSON.stringify(rules), { description: 'Block rules configuration' });
      
      reply.send(updatedRule);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Șterge regulă de blocare
  fastify.delete('/block-rules/:ruleId', async (request, reply) => {
    try {
      const { ruleId } = request.params as any;
      
      // Obține reguli curente
      const config = await siteConfigService.getConfig('block_rules');
      let rules = config && config.value ? JSON.parse(config.value as string) : [];
      
      const ruleIndex = rules.findIndex((r: any) => r.id === ruleId);
      if (ruleIndex === -1) {
        reply.code(404).send({ error: 'Rule not found' });
        return;
      }

      rules.splice(ruleIndex, 1);
      
      // Salvează în DB
      await siteConfigService.setConfig('block_rules', JSON.stringify(rules), { description: 'Block rules configuration' });
      
      reply.send({ success: true, message: 'Rule deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // === GESTIONARE FINANCIARĂ ===
  // Rutele pentru tranzacții au fost mutate în financial-reports.routes.ts

  // === GESTIONARE LOCAȚII DE LIVRARE REALE ===

  // Obține toate locațiile de livrare
  fastify.get('/delivery-locations', async (request, reply) => {
    try {
      const locations = await deliveryLocationService.getAllLocations();
      reply.send(locations);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Obține locațiile active
  fastify.get('/delivery-locations/active', async (request, reply) => {
    try {
      const locations = await deliveryLocationService.getActiveLocations();
      reply.send(locations);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Obține o locație specifică
  fastify.get('/delivery-locations/:locationId', async (request, reply) => {
    try {
      const { locationId } = request.params as any;
      const location = await deliveryLocationService.getLocationById(locationId);
      
      if (!location) {
        return reply.code(404).send({ error: 'Delivery location not found' });
      }
      
      reply.send(location);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Creează locație de livrare nouă
  fastify.post('/delivery-locations', async (request, reply) => {
    try {
      const locationData = request.body as any;
      const location = await deliveryLocationService.createLocation(locationData);
      reply.code(201).send(location);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Actualizează locație de livrare
  fastify.put('/delivery-locations/:locationId', async (request, reply) => {
    try {
      const { locationId } = request.params as any;
      const updateData = request.body as any;
      
      const location = await deliveryLocationService.updateLocation(locationId, updateData);
      reply.send(location);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Șterge locație de livrare
  fastify.delete('/delivery-locations/:locationId', async (request, reply) => {
    try {
      const { locationId } = request.params as any;
      await deliveryLocationService.deleteLocation(locationId);
      reply.send({ success: true, message: 'Delivery location deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Setează locația principală
  fastify.post('/delivery-locations/:locationId/set-main', async (request, reply) => {
    try {
      const { locationId } = request.params as any;
      await deliveryLocationService.setMainLocation(locationId);
      reply.send({ success: true, message: 'Main location updated successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Calculează costul de livrare
  fastify.post('/delivery-locations/:locationId/calculate-fee', async (request, reply) => {
    try {
      const { locationId } = request.params as any;
      const { orderTotal } = request.body as any;
      
      const feeInfo = await deliveryLocationService.calculateDeliveryFee(locationId, orderTotal);
      reply.send(feeInfo);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Verifică raza de livrare
  fastify.post('/delivery-locations/:locationId/check-radius', async (request, reply) => {
    try {
      const { locationId } = request.params as any;
      const { coordinates } = request.body as any;
      
      const radiusInfo = await deliveryLocationService.checkDeliveryRadius(locationId, coordinates);
      reply.send(radiusInfo);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Obține statistici pentru o locație
  fastify.get('/delivery-locations/:locationId/stats', async (request, reply) => {
    try {
      const { locationId } = request.params as any;
      const stats = await deliveryLocationService.getLocationStats(locationId);
      reply.send(stats);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Obține locațiile deschise astăzi
  fastify.get('/delivery-locations/open/today', async (request, reply) => {
    try {
      const locations = await deliveryLocationService.getLocationsOpenToday();
      reply.send(locations);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // === RAPOARTE FINANCIARE ===

  // Obține raportul financiar complet
  fastify.get('/reports/financial', async (request, reply) => {
    try {
      const filters = request.query as any;
      const report = await financialReportService.getFinancialReport(filters);
      reply.send(report);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Obține statistici pentru produse
  fastify.get('/reports/products', async (request, reply) => {
    try {
      const filters = request.query as any;
      const statistics = await financialReportService.getProductStatistics(filters);
      reply.send(statistics);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Obține statistici pentru clienți
  fastify.get('/reports/customers', async (request, reply) => {
    try {
      const filters = request.query as any;
      const statistics = await financialReportService.getCustomerStatistics(filters);
      reply.send(statistics);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Obține raport de vânzări pe categorii
  fastify.get('/reports/sales-by-category', async (request, reply) => {
    try {
      const filters = request.query as any;
      const report = await financialReportService.getSalesByCategory(filters);
      reply.send(report);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Exportă raportul în CSV
  fastify.get('/reports/export/csv', async (request, reply) => {
    try {
      const filters = request.query as any;
      const csv = await financialReportService.exportReportToCSV(filters);
      
      reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="raport-financiar-${new Date().toISOString().split('T')[0]}.csv"`)
        .send(csv);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // === GESTIONARE ELEMENTE UI ===

  // Obține toate elementele UI
  fastify.get('/ui-elements', async (request, reply) => {
    try {
      const elements = await uiElementService.getAllElements();
      reply.send(elements);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Obține elementele UI vizibile
  fastify.get('/ui-elements/visible', async (request, reply) => {
    try {
      const elements = await uiElementService.getVisibleElements();
      reply.send(elements);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Obține elementele UI pentru o pagină specifică
  fastify.get('/ui-elements/page/:page', async (request, reply) => {
    try {
      const { page } = request.params as any;
      const elements = await uiElementService.getElementsByPage(page);
      reply.send(elements);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Obține un element UI specific
  fastify.get('/ui-elements/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const element = await uiElementService.getElementById(id);
      
      if (!element) {
        return reply.code(404).send({ error: 'UI Element not found' });
      }
      
      reply.send(element);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Creează element UI nou
  fastify.post('/ui-elements', async (request, reply) => {
    try {
      const elementData = request.body as any;
      const userId = getUserId(request);
      
      const element = await uiElementService.createElement({
        ...elementData,
        createdById: userId
      });
      
      reply.code(201).send(element);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Actualizează element UI
  fastify.put('/ui-elements/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const updateData = request.body as any;
      
      const element = await uiElementService.updateElement(id, updateData);
      reply.send(element);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Șterge element UI
  fastify.delete('/ui-elements/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      await uiElementService.deleteElement(id);
      reply.send({ success: true, message: 'UI Element deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Toggle vizibilitate element UI
  fastify.patch('/ui-elements/:id/toggle-visibility', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const element = await uiElementService.toggleVisibility(id);
      reply.send(element);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Reordonează elemente UI
  fastify.patch('/ui-elements/:id/reorder', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { direction } = request.body as any;
      
      if (!direction || !['up', 'down'].includes(direction)) {
        return reply.code(400).send({ error: 'Invalid direction. Must be "up" or "down"' });
      }
      
      // Obține elementul curent
      const currentElement = await uiElementService.getElementById(id);
      if (!currentElement) {
        return reply.code(404).send({ error: 'UI Element not found' });
      }
      
      // Obține toate elementele sortate după order
      const allElements = await uiElementService.getAllElements();
      const sortedElements = allElements.sort((a, b) => a.order - b.order);
      
      // Găsește indexul elementului curent
      const currentIndex = sortedElements.findIndex(el => el.id === id);
      
      if (currentIndex === -1) {
        return reply.code(404).send({ error: 'Element not found in list' });
      }
      
      // Verifică dacă mutarea este posibilă
      if (direction === 'up' && currentIndex === 0) {
        return reply.send({ success: true, message: 'Element is already at the top' });
      }
      
      if (direction === 'down' && currentIndex === sortedElements.length - 1) {
        return reply.send({ success: true, message: 'Element is already at the bottom' });
      }
      
      // Calculează noul index
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      // Schimbă ordinea între elementul curent și cel cu care se schimbă
      const targetElement = sortedElements[newIndex];
      
      await Promise.all([
        uiElementService.updateElement(currentElement.id, { order: targetElement.order }),
        uiElementService.updateElement(targetElement.id, { order: currentElement.order })
      ]);
      
      reply.send({ success: true, message: 'Element reordered successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });
}