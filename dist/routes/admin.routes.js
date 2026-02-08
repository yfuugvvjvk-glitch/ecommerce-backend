"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = adminRoutes;
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_settings_service_1 = require("../services/admin-settings.service");
const advanced_product_service_1 = require("../services/advanced-product.service");
const page_service_1 = require("../services/page.service");
const delivery_location_service_1 = require("../services/delivery-location.service");
const site_config_service_1 = require("../services/site-config.service");
// Middleware pentru verificarea rolului de admin
const adminMiddleware = async (request, reply) => {
    if (request.user?.role !== 'admin') {
        return reply.code(403).send({ error: 'Access denied. Admin role required.' });
    }
};
async function adminRoutes(fastify) {
    // Aplicăm middleware-ul de autentificare și admin pentru toate rutele
    fastify.addHook('preHandler', auth_middleware_1.authMiddleware);
    fastify.addHook('preHandler', adminMiddleware);
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
            const users = await admin_settings_service_1.adminSettingsService.getAllUsers();
            reply.send({ users });
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
    // === GESTIONARE COMENZI ===
    fastify.get('/orders', async (request, reply) => {
        try {
            const { status } = request.query;
            const orders = await admin_settings_service_1.adminSettingsService.getAllOrders(status);
            reply.send({ orders });
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
            const vouchers = await admin_settings_service_1.adminSettingsService.getAllVouchers();
            reply.send(vouchers);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    fastify.post('/vouchers', async (request, reply) => {
        try {
            const voucherData = request.body;
            const voucher = await admin_settings_service_1.adminSettingsService.createVoucher(voucherData);
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
            const offer = await admin_settings_service_1.adminSettingsService.createOffer(offerData);
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
            const page = await page_service_1.pageService.createPage({
                ...pageData,
                createdById: request.user.userId
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
    // === PROGRAME DE LIVRARE ===
    // Obține toate programele de livrare
    fastify.get('/delivery-schedules', async (request, reply) => {
        try {
            // Mock data pentru moment - în producție ar fi din baza de date
            const mockSchedules = [
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
            reply.send(mockSchedules);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Creează program de livrare
    fastify.post('/delivery-schedules', async (request, reply) => {
        try {
            const scheduleData = request.body;
            // Mock response - în producție ar fi salvat în baza de date
            const newSchedule = {
                id: Date.now().toString(),
                ...scheduleData,
                specialDates: []
            };
            reply.code(201).send(newSchedule);
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
            // Mock response - în producție ar fi salvat în baza de date
            reply.send({ success: true, message: 'Special date added successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Obține setările de blocare comenzi
    fastify.get('/order-block-settings', async (request, reply) => {
        try {
            // Mock data pentru moment
            const mockSettings = {
                blockNewOrders: false,
                blockReason: '',
                allowedPaymentMethods: ['cash', 'card'],
                minimumOrderValue: 50,
                maximumOrderValue: null
            };
            reply.send(mockSettings);
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
            // Mock response - în producție ar fi salvat în baza de date
            reply.send({ success: true, message: 'Block settings updated successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // === GESTIONARE FINANCIARĂ ===
    // Obține toate tranzacțiile financiare
    fastify.get('/transactions', async (request, reply) => {
        try {
            const { startDate, endDate, type } = request.query;
            // Mock data pentru moment
            const mockTransactions = [
                {
                    id: '1',
                    type: 'EXPENSE',
                    category: 'Utilități',
                    amount: 250.50,
                    description: 'Factură electricitate',
                    date: '2026-02-01',
                    paymentMethod: 'transfer',
                    isRecurring: true,
                    recurringPeriod: 'MONTHLY',
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    type: 'REVENUE',
                    category: 'Vânzări Online',
                    amount: 1500.00,
                    description: 'Vânzări produse februarie',
                    date: '2026-02-03',
                    paymentMethod: 'card',
                    isRecurring: false,
                    createdAt: new Date().toISOString()
                }
            ];
            // Filtrează după tip dacă este specificat
            let filteredTransactions = mockTransactions;
            if (type && type !== 'all') {
                filteredTransactions = mockTransactions.filter(t => t.type === type.toUpperCase());
            }
            reply.send(filteredTransactions);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Creează tranzacție financiară
    fastify.post('/transactions', async (request, reply) => {
        try {
            const transactionData = request.body;
            // Mock response - în producție ar fi salvat în baza de date
            const newTransaction = {
                id: Date.now().toString(),
                ...transactionData,
                createdAt: new Date().toISOString()
            };
            // Broadcast real-time update
            if (fastify.io) {
                fastify.io.emit('financial_update', {
                    type: 'transaction_created',
                    transaction: newTransaction,
                    timestamp: new Date()
                });
            }
            reply.code(201).send(newTransaction);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Obține categoriile de tranzacții
    fastify.get('/transaction-categories', async (request, reply) => {
        try {
            // Mock data pentru moment
            const mockCategories = [
                { id: '1', name: 'Utilități', type: 'EXPENSE', color: '#EF4444', isActive: true },
                { id: '2', name: 'Marketing', type: 'EXPENSE', color: '#F59E0B', isActive: true },
                { id: '3', name: 'Materii Prime', type: 'EXPENSE', color: '#8B5CF6', isActive: true },
                { id: '4', name: 'Vânzări Online', type: 'REVENUE', color: '#10B981', isActive: true },
                { id: '5', name: 'Servicii', type: 'REVENUE', color: '#3B82F6', isActive: true }
            ];
            reply.send(mockCategories);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Creează categorie de tranzacții
    fastify.post('/transaction-categories', async (request, reply) => {
        try {
            const categoryData = request.body;
            // Mock response - în producție ar fi salvat în baza de date
            const newCategory = {
                id: Date.now().toString(),
                ...categoryData
            };
            reply.code(201).send(newCategory);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
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
}
