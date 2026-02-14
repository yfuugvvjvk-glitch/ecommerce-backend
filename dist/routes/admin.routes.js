"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = adminRoutes;
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const admin_settings_service_1 = require("../services/admin-settings.service");
const advanced_product_service_1 = require("../services/advanced-product.service");
const page_service_1 = require("../services/page.service");
const delivery_location_service_1 = require("../services/delivery-location.service");
const site_config_service_1 = require("../services/site-config.service");
const financial_report_service_1 = require("../services/financial-report.service");
const order_service_1 = require("../services/order.service");
const orderService = new order_service_1.OrderService();
// Mock storage pentru programe de livrare (în producție ar fi în baza de date)
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
// Helper function to get user ID from request
const getUserId = (request) => {
    const userId = request.user?.userId || request.user?.id;
    if (!userId) {
        throw new Error('User not authenticated');
    }
    return userId;
};
async function adminRoutes(fastify) {
    // Aplicăm middleware-ul de autentificare și admin pentru toate rutele
    fastify.addHook('preHandler', auth_middleware_1.authMiddleware);
    fastify.addHook('preHandler', admin_middleware_1.adminMiddleware);
    // === STATISTICI ===
    fastify.get('/stats', async (request, reply) => {
        try {
            const stats = await admin_settings_service_1.adminSettingsService.getAdminStats();
            reply.send(stats);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // === GESTIONARE UTILIZATORI ===
    fastify.get('/users', async (request, reply) => {
        try {
            const { page = 1, limit = 10 } = request.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            const [users, total] = await Promise.all([
                admin_settings_service_1.adminSettingsService.getAllUsers(skip, limitNum),
                admin_settings_service_1.adminSettingsService.getUsersCount()
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    fastify.get('/users/:userId/details', async (request, reply) => {
        try {
            const { userId } = request.params;
            const userDetails = await admin_settings_service_1.adminSettingsService.getUserDetails(userId);
            reply.send(userDetails);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    fastify.put('/users/:userId', async (request, reply) => {
        try {
            const { userId } = request.params;
            const updateData = request.body;
            const updatedUser = await admin_settings_service_1.adminSettingsService.updateUser(userId, updateData);
            reply.send(updatedUser);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    fastify.put('/users/:userId/role', async (request, reply) => {
        try {
            const { userId } = request.params;
            const { role } = request.body;
            const updatedUser = await admin_settings_service_1.adminSettingsService.updateUser(userId, { role });
            reply.send(updatedUser);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    fastify.delete('/users/:userId', async (request, reply) => {
        try {
            const { userId } = request.params;
            await admin_settings_service_1.adminSettingsService.deleteUser(userId);
            reply.send({ success: true, message: 'User deleted successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Generate temporary password for user
    fastify.post('/users/:userId/generate-temp-password', async (request, reply) => {
        try {
            const { userId } = request.params;
            const result = await admin_settings_service_1.adminSettingsService.generateTemporaryPassword(userId);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // === GESTIONARE COMENZI ===
    fastify.get('/orders', async (request, reply) => {
        try {
            const { status, page = 1, limit = 10 } = request.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            const [orders, total] = await Promise.all([
                admin_settings_service_1.adminSettingsService.getAllOrders(status, skip, limitNum),
                admin_settings_service_1.adminSettingsService.getOrdersCount(status)
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    fastify.put('/orders/:orderId', async (request, reply) => {
        try {
            const { orderId } = request.params;
            const updateData = request.body;
            const updatedOrder = await admin_settings_service_1.adminSettingsService.updateOrder(orderId, updateData);
            reply.send(updatedOrder);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Actualizează statusul unei comenzi și stocul produselor
    fastify.put('/orders/:orderId/status', async (request, reply) => {
        try {
            const { orderId } = request.params;
            const { status } = request.body;
            const updatedOrder = await admin_settings_service_1.adminSettingsService.updateOrder(orderId, { status });
            // Dacă comanda este livrată, actualizează stocul produselor
            if (status === 'DELIVERED') {
                await admin_settings_service_1.adminSettingsService.updateStockAfterDelivery(orderId);
            }
            // Dacă comanda este anulată, eliberează stocul rezervat
            if (status === 'CANCELLED') {
                await admin_settings_service_1.adminSettingsService.releaseReservedStock(orderId);
            }
            reply.send(updatedOrder);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    fastify.delete('/orders/:orderId', async (request, reply) => {
        try {
            const { orderId } = request.params;
            await admin_settings_service_1.adminSettingsService.deleteOrder(orderId);
            reply.send({ success: true, message: 'Order deleted successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // === GESTIONARE VOUCHERE ===
    fastify.get('/vouchers', async (request, reply) => {
        try {
            const { page = 1, limit = 10 } = request.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            const [vouchers, total] = await Promise.all([
                admin_settings_service_1.adminSettingsService.getAllVouchers(skip, limitNum),
                admin_settings_service_1.adminSettingsService.getVouchersCount()
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    fastify.post('/vouchers', async (request, reply) => {
        try {
            const voucherData = request.body;
            // Add the user ID from the authenticated request
            const userId = request.user?.userId;
            if (!userId) {
                return reply.code(401).send({ error: 'User not authenticated' });
            }
            const voucher = await admin_settings_service_1.adminSettingsService.createVoucher({
                ...voucherData,
                createdById: userId
            });
            reply.code(201).send(voucher);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    fastify.put('/vouchers/:voucherId', async (request, reply) => {
        try {
            const { voucherId } = request.params;
            const updateData = request.body;
            const voucher = await admin_settings_service_1.adminSettingsService.updateVoucher(voucherId, updateData);
            reply.send(voucher);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    fastify.delete('/vouchers/:voucherId', async (request, reply) => {
        try {
            const { voucherId } = request.params;
            await admin_settings_service_1.adminSettingsService.deleteVoucher(voucherId);
            reply.send({ success: true, message: 'Voucher deleted successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    fastify.get('/voucher-requests', async (request, reply) => {
        try {
            const requests = await admin_settings_service_1.adminSettingsService.getAllVoucherRequests();
            reply.send(requests);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    fastify.post('/voucher-requests/:requestId/approve', async (request, reply) => {
        try {
            const { requestId } = request.params;
            const result = await admin_settings_service_1.adminSettingsService.updateVoucherRequest(requestId, 'APPROVED');
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    fastify.post('/voucher-requests/:requestId/reject', async (request, reply) => {
        try {
            const { requestId } = request.params;
            const result = await admin_settings_service_1.adminSettingsService.updateVoucherRequest(requestId, 'REJECTED');
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    fastify.post('/voucher-requests/:requestId/reset', async (request, reply) => {
        try {
            const { requestId } = request.params;
            const result = await admin_settings_service_1.adminSettingsService.updateVoucherRequest(requestId, 'PENDING');
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    fastify.put('/voucher-requests/:requestId', async (request, reply) => {
        try {
            const { requestId } = request.params;
            const updateData = request.body;
            const result = await admin_settings_service_1.adminSettingsService.updateVoucherRequestData(requestId, updateData);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    fastify.delete('/voucher-requests/:requestId', async (request, reply) => {
        try {
            const { requestId } = request.params;
            await admin_settings_service_1.adminSettingsService.deleteVoucherRequest(requestId);
            reply.send({ success: true, message: 'Voucher request deleted successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // === GESTIONARE OFERTE ===
    fastify.get('/offers', async (request, reply) => {
        try {
            const offers = await admin_settings_service_1.adminSettingsService.getAllOffers();
            reply.send(offers);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    fastify.post('/offers', async (request, reply) => {
        try {
            const offerData = request.body;
            const userId = getUserId(request);
            const offer = await admin_settings_service_1.adminSettingsService.createOffer({
                ...offerData,
                createdById: userId
            });
            reply.code(201).send(offer);
        }
        catch (error) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    fastify.put('/offers/:offerId', async (request, reply) => {
        try {
            const { offerId } = request.params;
            const updateData = request.body;
            const offer = await admin_settings_service_1.adminSettingsService.updateOffer(offerId, updateData);
            reply.send(offer);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    fastify.delete('/offers/:offerId', async (request, reply) => {
        try {
            const { offerId } = request.params;
            await admin_settings_service_1.adminSettingsService.deleteOffer(offerId);
            reply.send({ success: true, message: 'Offer deleted successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // === DASHBOARD ===
    fastify.get('/dashboard', async (request, reply) => {
        try {
            const dashboard = await admin_settings_service_1.adminSettingsService.getAdminDashboard();
            reply.send(dashboard);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // === GESTIONARE STOC ===
    // Obține statistici de stoc
    fastify.get('/stock/statistics', async (request, reply) => {
        try {
            const { productId } = request.query;
            const statistics = await advanced_product_service_1.advancedProductService.getStockStatistics(productId);
            reply.send(statistics);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Adaugă stoc
    fastify.post('/stock/add', async (request, reply) => {
        try {
            const { productId, quantity, reason } = request.body;
            if (!productId || !quantity || quantity <= 0) {
                return reply.code(400).send({ error: 'Product ID and positive quantity are required' });
            }
            await advanced_product_service_1.advancedProductService.addStock(productId, quantity, reason || 'Manual stock addition', request.user.userId);
            reply.send({ success: true, message: 'Stock added successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Raport de stoc
    fastify.get('/stock/report', async (request, reply) => {
        try {
            const filters = request.query;
            const report = await admin_settings_service_1.adminSettingsService.getStockReport(filters);
            reply.send(report);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Marchează produse expirate
    fastify.post('/stock/mark-expired', async (request, reply) => {
        try {
            await advanced_product_service_1.advancedProductService.markExpiredProducts();
            reply.send({ success: true, message: 'Expired products marked successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // === SETĂRI PRODUSE ===
    // Setează produs ca perisabil
    fastify.put('/products/:productId/perishable', async (request, reply) => {
        try {
            const { productId } = request.params;
            const perishableData = request.body;
            const updated = await admin_settings_service_1.adminSettingsService.setProductPerishable(productId, perishableData);
            reply.send(updated);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Setează perioada de comandă în avans
    fastify.put('/products/:productId/advance-order', async (request, reply) => {
        try {
            const { productId } = request.params;
            const advanceData = request.body;
            const updated = await admin_settings_service_1.adminSettingsService.setProductAdvanceOrder(productId, advanceData);
            reply.send(updated);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Setează unități de măsură
    fastify.put('/products/:productId/units', async (request, reply) => {
        try {
            const { productId } = request.params;
            const unitData = request.body;
            const updated = await admin_settings_service_1.adminSettingsService.setProductUnits(productId, unitData);
            reply.send(updated);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Setează reguli de livrare pentru produs
    fastify.put('/products/:productId/delivery-rules', async (request, reply) => {
        try {
            const { productId } = request.params;
            const deliveryRules = request.body;
            const updated = await admin_settings_service_1.adminSettingsService.setProductDeliveryRules(productId, deliveryRules);
            reply.send(updated);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Actualizare în masă a produselor
    fastify.put('/products/bulk-update', async (request, reply) => {
        try {
            const { productIds, updates } = request.body;
            if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
                return reply.code(400).send({ error: 'Product IDs array is required' });
            }
            const results = await admin_settings_service_1.adminSettingsService.bulkUpdateProducts(productIds, updates);
            reply.send(results);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // === SETĂRI DE LIVRARE ===
    // Obține setările de livrare
    fastify.get('/delivery-settings', async (request, reply) => {
        try {
            const { activeOnly } = request.query;
            const settings = await admin_settings_service_1.adminSettingsService.getDeliverySettings(activeOnly === 'true');
            reply.send(settings);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Creează setări de livrare
    fastify.post('/delivery-settings', async (request, reply) => {
        try {
            const data = request.body;
            const settings = await admin_settings_service_1.adminSettingsService.createDeliverySettings(data);
            reply.code(201).send(settings);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Actualizează setări de livrare
    fastify.put('/delivery-settings/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const data = request.body;
            const settings = await admin_settings_service_1.adminSettingsService.updateDeliverySettings(id, data);
            reply.send(settings);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Șterge setări de livrare
    fastify.delete('/delivery-settings/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            await admin_settings_service_1.adminSettingsService.deleteDeliverySettings(id);
            reply.send({ success: true, message: 'Delivery settings deleted successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // === METODE DE PLATĂ ===
    // Obține metodele de plată
    fastify.get('/payment-methods', async (request, reply) => {
        try {
            const { activeOnly } = request.query;
            const methods = await admin_settings_service_1.adminSettingsService.getPaymentMethods(activeOnly === 'true');
            reply.send(methods);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Creează metodă de plată
    fastify.post('/payment-methods', async (request, reply) => {
        try {
            const data = request.body;
            const method = await admin_settings_service_1.adminSettingsService.createPaymentMethod(data);
            reply.code(201).send(method);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Actualizează metodă de plată
    fastify.put('/payment-methods/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const data = request.body;
            const method = await admin_settings_service_1.adminSettingsService.updatePaymentMethod(id, data);
            reply.send(method);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Șterge metodă de plată
    fastify.delete('/payment-methods/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            await admin_settings_service_1.adminSettingsService.deletePaymentMethod(id);
            reply.send({ success: true, message: 'Payment method deleted successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // === GESTIONARE PAGINI REALE ===
    // Obține toate paginile
    fastify.get('/content/pages', async (request, reply) => {
        try {
            const pages = await page_service_1.pageService.getAllPages();
            reply.send(pages);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Obține o pagină specifică
    fastify.get('/content/pages/:pageId', async (request, reply) => {
        try {
            const { pageId } = request.params;
            const page = await page_service_1.pageService.getPageById(pageId);
            if (!page) {
                return reply.code(404).send({ error: 'Page not found' });
            }
            reply.send(page);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Creează pagină nouă
    fastify.post('/content/pages', async (request, reply) => {
        try {
            const pageData = request.body;
            const userId = getUserId(request);
            const page = await page_service_1.pageService.createPage({
                ...pageData,
                createdById: userId
            });
            reply.code(201).send(page);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Actualizează pagină
    fastify.put('/content/pages/:pageId', async (request, reply) => {
        try {
            const { pageId } = request.params;
            const updateData = request.body;
            const page = await page_service_1.pageService.updatePage(pageId, updateData);
            reply.send(page);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Șterge pagină
    fastify.delete('/content/pages/:pageId', async (request, reply) => {
        try {
            const { pageId } = request.params;
            await page_service_1.pageService.deletePage(pageId);
            reply.send({ success: true, message: 'Page deleted successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Publică/depublică pagină
    fastify.post('/content/pages/:pageId/toggle-publication', async (request, reply) => {
        try {
            const { pageId } = request.params;
            const page = await page_service_1.pageService.togglePagePublication(pageId);
            reply.send(page);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Gestionare secțiuni pagină
    fastify.post('/content/pages/:pageId/sections', async (request, reply) => {
        try {
            const { pageId } = request.params;
            const sectionData = request.body;
            const section = await page_service_1.pageService.addPageSection(pageId, sectionData);
            reply.code(201).send(section);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    fastify.put('/content/sections/:sectionId', async (request, reply) => {
        try {
            const { sectionId } = request.params;
            const updateData = request.body;
            const section = await page_service_1.pageService.updatePageSection(sectionId, updateData);
            reply.send(section);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    fastify.delete('/content/sections/:sectionId', async (request, reply) => {
        try {
            const { sectionId } = request.params;
            await page_service_1.pageService.deletePageSection(sectionId);
            reply.send({ success: true, message: 'Section deleted successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Reordonează secțiuni
    fastify.put('/content/pages/:pageId/sections/reorder', async (request, reply) => {
        try {
            const { pageId } = request.params;
            const { sectionIds } = request.body;
            await page_service_1.pageService.reorderPageSections(pageId, sectionIds);
            reply.send({ success: true, message: 'Sections reordered successfully' });
        }
        catch (error) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // === GESTIONARE CONFIGURAȚII SITE ===
    // Obține toate configurațiile
    fastify.get('/site-config', async (request, reply) => {
        try {
            const configs = await site_config_service_1.siteConfigService.getAllConfigs();
            reply.send(configs);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Obține o configurație specifică
    fastify.get('/site-config/:key', async (request, reply) => {
        try {
            const { key } = request.params;
            const config = await site_config_service_1.siteConfigService.getConfig(key);
            if (!config) {
                return reply.code(404).send({ error: 'Configuration not found' });
            }
            reply.send(config);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Setează o configurație
    fastify.put('/site-config/:key', async (request, reply) => {
        try {
            const { key } = request.params;
            const { value, type, description, isPublic } = request.body;
            const config = await site_config_service_1.siteConfigService.setConfig(key, value, {
                type,
                description,
                isPublic,
                updatedById: request.user.userId
            });
            reply.send(config);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Setează configurații în masă
    fastify.put('/site-config', async (request, reply) => {
        try {
            const { configs } = request.body;
            const results = await site_config_service_1.siteConfigService.setBulkConfigs(configs, request.user.userId);
            reply.send(results);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Șterge o configurație
    fastify.delete('/site-config/:key', async (request, reply) => {
        try {
            const { key } = request.params;
            await site_config_service_1.siteConfigService.deleteConfig(key);
            reply.send({ success: true, message: 'Configuration deleted successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Inițializează configurațiile implicite
    fastify.post('/site-config/initialize', async (request, reply) => {
        try {
            const result = await site_config_service_1.siteConfigService.initializeDefaultConfigs();
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // === ANNOUNCEMENT BANNER ===
    // Obține configurația banner-ului de anunțuri
    fastify.get('/announcement-banner', async (request, reply) => {
        try {
            const config = await site_config_service_1.siteConfigService.getConfig('announcement_banner');
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ success: false, error: { code: 'SERVER_ERROR', message: errorMessage } });
        }
    });
    // Actualizează configurația banner-ului de anunțuri
    fastify.put('/announcement-banner', async (request, reply) => {
        try {
            const config = request.body;
            // Validare server-side
            const errors = [];
            // Validare titlu
            if (typeof config.title !== 'string') {
                errors.push('Title must be a string');
            }
            else if (config.title.length > 200) {
                errors.push('Title cannot exceed 200 characters');
            }
            // Validare descriere
            if (typeof config.description !== 'string') {
                errors.push('Description must be a string');
            }
            else if (config.description.length > 1000) {
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
            const updatedConfig = await site_config_service_1.siteConfigService.setConfig('announcement_banner', config, {
                type: 'json',
                description: 'Announcement banner configuration',
                isPublic: true,
                updatedById: userId
            });
            // WebSocket broadcast este deja gestionat de siteConfigService.setConfig()
            reply.send({ success: true, data: updatedConfig.value });
        }
        catch (error) {
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
            const config = await site_config_service_1.siteConfigService.getConfig('delivery_schedules');
            if (config && config.value) {
                const schedules = JSON.parse(config.value);
                reply.send(schedules);
            }
            else {
                // Returnează și salvează valorile implicite
                await site_config_service_1.siteConfigService.setConfig('delivery_schedules', JSON.stringify(deliverySchedules), { description: 'Delivery schedules configuration' });
                reply.send(deliverySchedules);
            }
        }
        catch (error) {
            console.error('Error loading delivery schedules:', error);
            reply.send(deliverySchedules);
        }
    });
    // Creează program de livrare
    fastify.post('/delivery-schedules', async (request, reply) => {
        try {
            const scheduleData = request.body;
            const newSchedule = {
                id: Date.now().toString(),
                ...scheduleData,
                specialDates: scheduleData.specialDates || []
            };
            // Obține schedules curente din DB
            const config = await site_config_service_1.siteConfigService.getConfig('delivery_schedules');
            let schedules = config && config.value ? JSON.parse(config.value) : deliverySchedules;
            schedules.push(newSchedule);
            // Salvează în DB
            await site_config_service_1.siteConfigService.setConfig('delivery_schedules', JSON.stringify(schedules), { description: 'Delivery schedules configuration' });
            reply.code(201).send(newSchedule);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Actualizează program de livrare
    fastify.put('/delivery-schedules/:scheduleId', async (request, reply) => {
        try {
            const { scheduleId } = request.params;
            const scheduleData = request.body;
            // Obține schedules curente din DB
            const config = await site_config_service_1.siteConfigService.getConfig('delivery_schedules');
            let schedules = config && config.value ? JSON.parse(config.value) : deliverySchedules;
            const scheduleIndex = schedules.findIndex((s) => s.id === scheduleId);
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
            await site_config_service_1.siteConfigService.setConfig('delivery_schedules', JSON.stringify(schedules), { description: 'Delivery schedules configuration' });
            reply.send(updatedSchedule);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Adaugă dată specială la program
    fastify.post('/delivery-schedules/:scheduleId/special-dates', async (request, reply) => {
        try {
            const { scheduleId } = request.params;
            const specialDateData = request.body;
            // Obține schedules din DB
            const config = await site_config_service_1.siteConfigService.getConfig('delivery_schedules');
            let schedules = config && config.value ? JSON.parse(config.value) : deliverySchedules;
            const schedule = schedules.find((s) => s.id === scheduleId);
            if (!schedule) {
                reply.code(404).send({ error: 'Schedule not found' });
                return;
            }
            schedule.specialDates.push(specialDateData);
            // Salvează în DB
            await site_config_service_1.siteConfigService.setConfig('delivery_schedules', JSON.stringify(schedules), { description: 'Delivery schedules configuration' });
            reply.send({ success: true, message: 'Special date added successfully', schedule });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Șterge dată specială din program
    fastify.delete('/delivery-schedules/:scheduleId/special-dates/:dateIndex', async (request, reply) => {
        try {
            const { scheduleId, dateIndex } = request.params;
            // Obține schedules din DB
            const config = await site_config_service_1.siteConfigService.getConfig('delivery_schedules');
            let schedules = config && config.value ? JSON.parse(config.value) : deliverySchedules;
            const schedule = schedules.find((s) => s.id === scheduleId);
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
            await site_config_service_1.siteConfigService.setConfig('delivery_schedules', JSON.stringify(schedules), { description: 'Delivery schedules configuration' });
            reply.send({ success: true, message: 'Special date deleted successfully', schedule });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Șterge program de livrare
    fastify.delete('/delivery-schedules/:scheduleId', async (request, reply) => {
        try {
            const { scheduleId } = request.params;
            // Obține schedules din DB
            const config = await site_config_service_1.siteConfigService.getConfig('delivery_schedules');
            let schedules = config && config.value ? JSON.parse(config.value) : deliverySchedules;
            const scheduleIndex = schedules.findIndex((s) => s.id === scheduleId);
            if (scheduleIndex === -1) {
                reply.code(404).send({ error: 'Schedule not found' });
                return;
            }
            schedules.splice(scheduleIndex, 1);
            // Salvează în DB
            await site_config_service_1.siteConfigService.setConfig('delivery_schedules', JSON.stringify(schedules), { description: 'Delivery schedules configuration' });
            reply.send({ success: true, message: 'Schedule deleted successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Obține setările de blocare comenzi
    fastify.get('/order-block-settings', async (request, reply) => {
        try {
            const settings = await orderService.getOrderBlockSettings();
            reply.send(settings);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Actualizează setările de blocare comenzi
    fastify.put('/order-block-settings', async (request, reply) => {
        try {
            const blockSettings = request.body;
            console.log('Received block settings:', blockSettings);
            if (!blockSettings) {
                return reply.code(400).send({ error: 'Block settings are required' });
            }
            const updatedSettings = await orderService.updateOrderBlockSettings(blockSettings);
            console.log('Updated settings:', updatedSettings);
            reply.send(updatedSettings);
        }
        catch (error) {
            console.error('Error updating block settings:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // === GESTIONARE REGULI DE BLOCARE (MULTIPLE) ===
    // Obține toate regulile de blocare
    fastify.get('/block-rules', async (request, reply) => {
        try {
            const config = await site_config_service_1.siteConfigService.getConfig('block_rules');
            const rules = config && config.value ? JSON.parse(config.value) : [];
            reply.send(rules);
        }
        catch (error) {
            console.error('Error loading block rules:', error);
            reply.send([]);
        }
    });
    // Creează regulă de blocare
    fastify.post('/block-rules', async (request, reply) => {
        try {
            const ruleData = request.body;
            const newRule = {
                id: Date.now().toString(),
                ...ruleData,
                createdAt: new Date().toISOString()
            };
            // Obține reguli curente
            const config = await site_config_service_1.siteConfigService.getConfig('block_rules');
            let rules = config && config.value ? JSON.parse(config.value) : [];
            rules.push(newRule);
            // Salvează în DB
            await site_config_service_1.siteConfigService.setConfig('block_rules', JSON.stringify(rules), { description: 'Block rules configuration' });
            reply.code(201).send(newRule);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Actualizează regulă de blocare
    fastify.put('/block-rules/:ruleId', async (request, reply) => {
        try {
            const { ruleId } = request.params;
            const ruleData = request.body;
            // Obține reguli curente
            const config = await site_config_service_1.siteConfigService.getConfig('block_rules');
            let rules = config && config.value ? JSON.parse(config.value) : [];
            const ruleIndex = rules.findIndex((r) => r.id === ruleId);
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
            await site_config_service_1.siteConfigService.setConfig('block_rules', JSON.stringify(rules), { description: 'Block rules configuration' });
            reply.send(updatedRule);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Șterge regulă de blocare
    fastify.delete('/block-rules/:ruleId', async (request, reply) => {
        try {
            const { ruleId } = request.params;
            // Obține reguli curente
            const config = await site_config_service_1.siteConfigService.getConfig('block_rules');
            let rules = config && config.value ? JSON.parse(config.value) : [];
            const ruleIndex = rules.findIndex((r) => r.id === ruleId);
            if (ruleIndex === -1) {
                reply.code(404).send({ error: 'Rule not found' });
                return;
            }
            rules.splice(ruleIndex, 1);
            // Salvează în DB
            await site_config_service_1.siteConfigService.setConfig('block_rules', JSON.stringify(rules), { description: 'Block rules configuration' });
            reply.send({ success: true, message: 'Rule deleted successfully' });
        }
        catch (error) {
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
            const locations = await delivery_location_service_1.deliveryLocationService.getAllLocations();
            reply.send(locations);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Obține locațiile active
    fastify.get('/delivery-locations/active', async (request, reply) => {
        try {
            const locations = await delivery_location_service_1.deliveryLocationService.getActiveLocations();
            reply.send(locations);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Obține o locație specifică
    fastify.get('/delivery-locations/:locationId', async (request, reply) => {
        try {
            const { locationId } = request.params;
            const location = await delivery_location_service_1.deliveryLocationService.getLocationById(locationId);
            if (!location) {
                return reply.code(404).send({ error: 'Delivery location not found' });
            }
            reply.send(location);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Creează locație de livrare nouă
    fastify.post('/delivery-locations', async (request, reply) => {
        try {
            const locationData = request.body;
            const location = await delivery_location_service_1.deliveryLocationService.createLocation(locationData);
            reply.code(201).send(location);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Actualizează locație de livrare
    fastify.put('/delivery-locations/:locationId', async (request, reply) => {
        try {
            const { locationId } = request.params;
            const updateData = request.body;
            const location = await delivery_location_service_1.deliveryLocationService.updateLocation(locationId, updateData);
            reply.send(location);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Șterge locație de livrare
    fastify.delete('/delivery-locations/:locationId', async (request, reply) => {
        try {
            const { locationId } = request.params;
            await delivery_location_service_1.deliveryLocationService.deleteLocation(locationId);
            reply.send({ success: true, message: 'Delivery location deleted successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Setează locația principală
    fastify.post('/delivery-locations/:locationId/set-main', async (request, reply) => {
        try {
            const { locationId } = request.params;
            await delivery_location_service_1.deliveryLocationService.setMainLocation(locationId);
            reply.send({ success: true, message: 'Main location updated successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Calculează costul de livrare
    fastify.post('/delivery-locations/:locationId/calculate-fee', async (request, reply) => {
        try {
            const { locationId } = request.params;
            const { orderTotal } = request.body;
            const feeInfo = await delivery_location_service_1.deliveryLocationService.calculateDeliveryFee(locationId, orderTotal);
            reply.send(feeInfo);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Verifică raza de livrare
    fastify.post('/delivery-locations/:locationId/check-radius', async (request, reply) => {
        try {
            const { locationId } = request.params;
            const { coordinates } = request.body;
            const radiusInfo = await delivery_location_service_1.deliveryLocationService.checkDeliveryRadius(locationId, coordinates);
            reply.send(radiusInfo);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Obține statistici pentru o locație
    fastify.get('/delivery-locations/:locationId/stats', async (request, reply) => {
        try {
            const { locationId } = request.params;
            const stats = await delivery_location_service_1.deliveryLocationService.getLocationStats(locationId);
            reply.send(stats);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Obține locațiile deschise astăzi
    fastify.get('/delivery-locations/open/today', async (request, reply) => {
        try {
            const locations = await delivery_location_service_1.deliveryLocationService.getLocationsOpenToday();
            reply.send(locations);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // === RAPOARTE FINANCIARE ===
    // Obține raportul financiar complet
    fastify.get('/reports/financial', async (request, reply) => {
        try {
            const filters = request.query;
            const report = await financial_report_service_1.financialReportService.getFinancialReport(filters);
            reply.send(report);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Obține statistici pentru produse
    fastify.get('/reports/products', async (request, reply) => {
        try {
            const filters = request.query;
            const statistics = await financial_report_service_1.financialReportService.getProductStatistics(filters);
            reply.send(statistics);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Obține statistici pentru clienți
    fastify.get('/reports/customers', async (request, reply) => {
        try {
            const filters = request.query;
            const statistics = await financial_report_service_1.financialReportService.getCustomerStatistics(filters);
            reply.send(statistics);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Obține raport de vânzări pe categorii
    fastify.get('/reports/sales-by-category', async (request, reply) => {
        try {
            const filters = request.query;
            const report = await financial_report_service_1.financialReportService.getSalesByCategory(filters);
            reply.send(report);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Exportă raportul în CSV
    fastify.get('/reports/export/csv', async (request, reply) => {
        try {
            const filters = request.query;
            const csv = await financial_report_service_1.financialReportService.exportReportToCSV(filters);
            reply
                .header('Content-Type', 'text/csv; charset=utf-8')
                .header('Content-Disposition', `attachment; filename="raport-financiar-${new Date().toISOString().split('T')[0]}.csv"`)
                .send(csv);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
}
