"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSettingsService = exports.AdminSettingsService = void 0;
const prisma_1 = require("../utils/prisma");
class AdminSettingsService {
    // Statistici pentru dashboard admin
    async getAdminStats() {
        try {
            const [totalUsers, totalProducts, totalOrders, totalRevenue, recentOrders] = await Promise.all([
                prisma_1.prisma.user.count(),
                prisma_1.prisma.dataItem.count(),
                prisma_1.prisma.order.count(),
                prisma_1.prisma.order.aggregate({
                    _sum: { total: true },
                    where: { status: 'COMPLETED' }
                }),
                prisma_1.prisma.order.findMany({
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: { name: true, email: true }
                        }
                    }
                })
            ]);
            return {
                totalUsers,
                totalProducts,
                totalOrders,
                totalRevenue: totalRevenue._sum.total || 0,
                recentOrders
            };
        }
        catch (error) {
            console.error('Error fetching admin stats:', error);
            throw new Error('Failed to fetch admin statistics');
        }
    }
    // Gestionare utilizatori
    async getAllUsers() {
        try {
            return await prisma_1.prisma.user.findMany({
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    address: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            orders: true,
                            reviews: true,
                            favorites: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        catch (error) {
            console.error('Error fetching users:', error);
            throw new Error('Failed to fetch users');
        }
    }
    async getUserDetails(userId) {
        try {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    address: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                    orders: {
                        take: 10,
                        orderBy: { createdAt: 'desc' },
                        select: {
                            id: true,
                            total: true,
                            status: true,
                            createdAt: true
                        }
                    },
                    reviews: {
                        take: 10,
                        orderBy: { createdAt: 'desc' },
                        include: {
                            dataItem: {
                                select: { title: true }
                            }
                        }
                    },
                    _count: {
                        select: {
                            orders: true,
                            reviews: true,
                            favorites: true
                        }
                    }
                }
            });
            if (!user) {
                throw new Error('User not found');
            }
            return user;
        }
        catch (error) {
            console.error('Error fetching user details:', error);
            throw new Error('Failed to fetch user details');
        }
    }
    async updateUser(userId, updateData) {
        try {
            const { password, ...safeUpdateData } = updateData;
            // If password is provided, hash it
            if (password) {
                const bcrypt = require('bcrypt');
                safeUpdateData.password = await bcrypt.hash(password, 10);
            }
            const updatedUser = await prisma_1.prisma.user.update({
                where: { id: userId },
                data: safeUpdateData,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    address: true,
                    role: true,
                    updatedAt: true
                }
            });
            return updatedUser;
        }
        catch (error) {
            console.error('Error updating user:', error);
            throw new Error('Failed to update user');
        }
    }
    async deleteUser(userId) {
        try {
            // Check if user exists and is not the last admin
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user) {
                throw new Error('User not found');
            }
            if (user.role === 'admin') {
                const adminCount = await prisma_1.prisma.user.count({
                    where: { role: 'admin' }
                });
                if (adminCount <= 1) {
                    throw new Error('Cannot delete the last admin user');
                }
            }
            await prisma_1.prisma.user.delete({
                where: { id: userId }
            });
            return { success: true };
        }
        catch (error) {
            console.error('Error deleting user:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to delete user');
        }
    }
    // Gestionare comenzi
    async getAllOrders(status) {
        try {
            const where = status ? { status } : {};
            return await prisma_1.prisma.order.findMany({
                where,
                include: {
                    user: {
                        select: { name: true, email: true }
                    },
                    orderItems: {
                        include: {
                            dataItem: {
                                select: { title: true, price: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        catch (error) {
            console.error('Error fetching orders:', error);
            throw new Error('Failed to fetch orders');
        }
    }
    async updateOrder(orderId, updateData) {
        try {
            return await prisma_1.prisma.order.update({
                where: { id: orderId },
                data: updateData,
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            });
        }
        catch (error) {
            console.error('Error updating order:', error);
            throw new Error('Failed to update order');
        }
    }
    async deleteOrder(orderId) {
        try {
            // Delete order items first
            await prisma_1.prisma.orderItem.deleteMany({
                where: { orderId }
            });
            // Delete the order
            await prisma_1.prisma.order.delete({
                where: { id: orderId }
            });
            return { success: true };
        }
        catch (error) {
            console.error('Error deleting order:', error);
            throw new Error('Failed to delete order');
        }
    }
    // Gestionare vouchere
    async getAllVouchers() {
        try {
            return await prisma_1.prisma.voucher.findMany({
                include: {
                    createdBy: {
                        select: { name: true, email: true }
                    },
                    _count: {
                        select: { userVouchers: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        catch (error) {
            console.error('Error fetching vouchers:', error);
            throw new Error('Failed to fetch vouchers');
        }
    }
    async createVoucher(voucherData) {
        try {
            return await prisma_1.prisma.voucher.create({
                data: {
                    ...voucherData,
                    createdById: voucherData.createdById || voucherData.userId
                }
            });
        }
        catch (error) {
            console.error('Error creating voucher:', error);
            throw new Error('Failed to create voucher');
        }
    }
    async updateVoucher(voucherId, updateData) {
        try {
            return await prisma_1.prisma.voucher.update({
                where: { id: voucherId },
                data: updateData
            });
        }
        catch (error) {
            console.error('Error updating voucher:', error);
            throw new Error('Failed to update voucher');
        }
    }
    async deleteVoucher(voucherId) {
        try {
            // Delete related user vouchers first
            await prisma_1.prisma.userVoucher.deleteMany({
                where: { voucherId }
            });
            await prisma_1.prisma.voucher.delete({
                where: { id: voucherId }
            });
            return { success: true };
        }
        catch (error) {
            console.error('Error deleting voucher:', error);
            throw new Error('Failed to delete voucher');
        }
    }
    async getAllVoucherRequests() {
        try {
            return await prisma_1.prisma.voucherRequest.findMany({
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        catch (error) {
            console.error('Error fetching voucher requests:', error);
            throw new Error('Failed to fetch voucher requests');
        }
    }
    async updateVoucherRequest(requestId, status) {
        try {
            const request = await prisma_1.prisma.voucherRequest.update({
                where: { id: requestId },
                data: { status },
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            });
            // If approved, create voucher
            if (status === 'APPROVED') {
                await prisma_1.prisma.voucher.create({
                    data: {
                        code: `REQ-${Date.now()}`,
                        discountType: 'PERCENTAGE',
                        discountValue: 10, // Default 10% discount
                        maxUsage: 1,
                        createdById: request.userId,
                        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                    }
                });
            }
            return request;
        }
        catch (error) {
            console.error('Error updating voucher request:', error);
            throw new Error('Failed to update voucher request');
        }
    }
    async updateVoucherRequestData(requestId, updateData) {
        try {
            return await prisma_1.prisma.voucherRequest.update({
                where: { id: requestId },
                data: updateData,
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            });
        }
        catch (error) {
            console.error('Error updating voucher request data:', error);
            throw new Error('Failed to update voucher request data');
        }
    }
    async deleteVoucherRequest(requestId) {
        try {
            await prisma_1.prisma.voucherRequest.delete({
                where: { id: requestId }
            });
            return { success: true };
        }
        catch (error) {
            console.error('Error deleting voucher request:', error);
            throw new Error('Failed to delete voucher request');
        }
    }
    // Gestionare oferte
    async getAllOffers() {
        try {
            return await prisma_1.prisma.offer.findMany({
                include: {
                    products: {
                        include: {
                            dataItem: {
                                select: { title: true, price: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        catch (error) {
            console.error('Error fetching offers:', error);
            throw new Error('Failed to fetch offers');
        }
    }
    async createOffer(offerData) {
        try {
            return await prisma_1.prisma.offer.create({
                data: offerData
            });
        }
        catch (error) {
            console.error('Error creating offer:', error);
            throw new Error('Failed to create offer');
        }
    }
    async updateOffer(offerId, updateData) {
        try {
            return await prisma_1.prisma.offer.update({
                where: { id: offerId },
                data: updateData
            });
        }
        catch (error) {
            console.error('Error updating offer:', error);
            throw new Error('Failed to update offer');
        }
    }
    async deleteOffer(offerId) {
        try {
            // Delete related product offers first
            await prisma_1.prisma.productOffer.deleteMany({
                where: { offerId }
            });
            await prisma_1.prisma.offer.delete({
                where: { id: offerId }
            });
            return { success: true };
        }
        catch (error) {
            console.error('Error deleting offer:', error);
            throw new Error('Failed to delete offer');
        }
    }
    // Gestionare setări de livrare
    async createDeliverySettings(data) {
        return await prisma_1.prisma.deliverySettings.create({
            data: {
                ...data,
                availableDeliveryDays: data.availableDeliveryDays ? JSON.stringify(data.availableDeliveryDays) : null,
                deliveryAreas: data.deliveryAreas ? JSON.stringify(data.deliveryAreas) : null
            }
        });
    }
    async updateDeliverySettings(id, data) {
        const updateData = { ...data };
        if (data.availableDeliveryDays) {
            updateData.availableDeliveryDays = JSON.stringify(data.availableDeliveryDays);
        }
        if (data.deliveryAreas) {
            updateData.deliveryAreas = JSON.stringify(data.deliveryAreas);
        }
        return await prisma_1.prisma.deliverySettings.update({
            where: { id },
            data: updateData
        });
    }
    async getDeliverySettings(activeOnly = false) {
        const settings = await prisma_1.prisma.deliverySettings.findMany({
            where: activeOnly ? { isActive: true } : {},
            orderBy: { createdAt: 'desc' }
        });
        return settings.map(setting => ({
            ...setting,
            availableDeliveryDays: setting.availableDeliveryDays ? JSON.parse(setting.availableDeliveryDays) : null,
            deliveryAreas: setting.deliveryAreas ? JSON.parse(setting.deliveryAreas) : null
        }));
    }
    async deleteDeliverySettings(id) {
        return await prisma_1.prisma.deliverySettings.delete({
            where: { id }
        });
    }
    // Gestionare metode de plată
    async createPaymentMethod(data) {
        return await prisma_1.prisma.paymentMethod.create({
            data: {
                ...data,
                settings: data.settings ? JSON.stringify(data.settings) : null
            }
        });
    }
    async updatePaymentMethod(id, data) {
        const updateData = { ...data };
        if (data.settings) {
            updateData.settings = JSON.stringify(data.settings);
        }
        return await prisma_1.prisma.paymentMethod.update({
            where: { id },
            data: updateData
        });
    }
    async getPaymentMethods(activeOnly = false) {
        const methods = await prisma_1.prisma.paymentMethod.findMany({
            where: activeOnly ? { isActive: true } : {},
            orderBy: { createdAt: 'desc' }
        });
        return methods.map(method => ({
            ...method,
            settings: method.settings ? JSON.parse(method.settings) : null
        }));
    }
    async deletePaymentMethod(id) {
        return await prisma_1.prisma.paymentMethod.delete({
            where: { id }
        });
    }
    // Actualizare în masă a produselor
    async bulkUpdateProducts(productIds, updates) {
        const results = [];
        for (const productId of productIds) {
            try {
                const updated = await prisma_1.prisma.dataItem.update({
                    where: { id: productId },
                    data: updates
                });
                results.push({ productId, success: true, data: updated });
            }
            catch (error) {
                results.push({
                    productId,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        return results;
    }
    // Setează perioada de livrare pentru produse specifice
    async setProductDeliveryRules(productId, rules) {
        return await prisma_1.prisma.dataItem.update({
            where: { id: productId },
            data: {
                ...rules,
                availableDeliveryDays: rules.availableDeliveryDays ? JSON.stringify(rules.availableDeliveryDays) : null
            }
        });
    }
    // Setează produse ca perisabile
    async setProductPerishable(productId, perishableData) {
        return await prisma_1.prisma.dataItem.update({
            where: { id: productId },
            data: perishableData
        });
    }
    // Setează perioada de comandă în avans
    async setProductAdvanceOrder(productId, advanceData) {
        return await prisma_1.prisma.dataItem.update({
            where: { id: productId },
            data: advanceData
        });
    }
    // Setează unități de măsură
    async setProductUnits(productId, unitData) {
        return await prisma_1.prisma.dataItem.update({
            where: { id: productId },
            data: unitData
        });
    }
    // Dashboard pentru admin - statistici generale
    async getAdminDashboard() {
        const [totalProducts, lowStockProducts, expiredProducts, recentOrders, topSellingProducts, stockMovements] = await Promise.all([
            // Total produse
            prisma_1.prisma.dataItem.count(),
            // Produse cu stoc scăzut
            prisma_1.prisma.dataItem.count({
                where: {
                    availableStock: {
                        lte: prisma_1.prisma.dataItem.fields.lowStockAlert
                    }
                }
            }),
            // Produse expirate
            prisma_1.prisma.dataItem.count({
                where: {
                    isPerishable: true,
                    expiryDate: {
                        lt: new Date()
                    }
                }
            }),
            // Comenzi recente
            prisma_1.prisma.order.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            }),
            // Produse cel mai bine vândute
            prisma_1.prisma.dataItem.findMany({
                take: 10,
                orderBy: { totalSold: 'desc' },
                select: {
                    id: true,
                    title: true,
                    totalSold: true,
                    stock: true,
                    availableStock: true
                }
            }),
            // Mișcări de stoc recente
            prisma_1.prisma.stockMovement.findMany({
                take: 20,
                orderBy: { createdAt: 'desc' },
                include: {
                    dataItem: {
                        select: { title: true }
                    },
                    user: {
                        select: { name: true }
                    }
                }
            })
        ]);
        return {
            statistics: {
                totalProducts,
                lowStockProducts,
                expiredProducts,
                totalOrders: recentOrders.length
            },
            recentOrders,
            topSellingProducts,
            stockMovements
        };
    }
    // Raport de stoc detaliat
    async getStockReport(filters) {
        const whereClause = {};
        if (filters?.categoryId) {
            whereClause.categoryId = filters.categoryId;
        }
        if (filters?.lowStock) {
            whereClause.availableStock = {
                lte: prisma_1.prisma.dataItem.fields.lowStockAlert
            };
        }
        if (filters?.expired) {
            whereClause.isPerishable = true;
            whereClause.expiryDate = {
                lt: new Date()
            };
        }
        if (filters?.perishable) {
            whereClause.isPerishable = true;
        }
        return await prisma_1.prisma.dataItem.findMany({
            where: whereClause,
            include: {
                category: {
                    select: { name: true }
                },
                stockMovements: {
                    take: 5,
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }
    // === GESTIONARE STOC DUPĂ COMENZI ===
    // Actualizează stocul după livrarea unei comenzi
    async updateStockAfterDelivery(orderId) {
        try {
            const order = await prisma_1.prisma.order.findUnique({
                where: { id: orderId },
                include: {
                    orderItems: {
                        include: {
                            dataItem: true
                        }
                    }
                }
            });
            if (!order) {
                throw new Error('Order not found');
            }
            // Actualizează stocul pentru fiecare produs din comandă
            for (const item of order.orderItems) {
                await prisma_1.prisma.dataItem.update({
                    where: { id: item.dataItemId },
                    data: {
                        // Scade din stocul total
                        stock: { decrement: item.quantity },
                        // Scade din stocul rezervat
                        reservedStock: { decrement: item.quantity },
                        // Adaugă la totalul vândut
                        totalSold: { increment: item.quantity },
                        // Actualizează disponibilitatea
                        isInStock: {
                            set: await this.checkIfInStock(item.dataItemId, item.quantity)
                        }
                    }
                });
                // Înregistrează mișcarea de stoc
                await prisma_1.prisma.stockMovement.create({
                    data: {
                        dataItemId: item.dataItemId,
                        type: 'OUT',
                        quantity: item.quantity,
                        reason: `Comandă livrată #${orderId.slice(-6)}`,
                        orderId: orderId
                    }
                });
            }
            console.log(`Stock updated for delivered order ${orderId}`);
        }
        catch (error) {
            console.error('Error updating stock after delivery:', error);
            throw new Error('Failed to update stock after delivery');
        }
    }
    // Eliberează stocul rezervat pentru o comandă anulată
    async releaseReservedStock(orderId) {
        try {
            const order = await prisma_1.prisma.order.findUnique({
                where: { id: orderId },
                include: {
                    orderItems: {
                        include: {
                            dataItem: true
                        }
                    }
                }
            });
            if (!order) {
                throw new Error('Order not found');
            }
            // Eliberează stocul rezervat pentru fiecare produs
            for (const item of order.orderItems) {
                await prisma_1.prisma.dataItem.update({
                    where: { id: item.dataItemId },
                    data: {
                        // Scade din stocul rezervat
                        reservedStock: { decrement: item.quantity },
                        // Crește stocul disponibil
                        availableStock: { increment: item.quantity },
                        // Actualizează disponibilitatea
                        isInStock: true
                    }
                });
                // Înregistrează mișcarea de stoc
                await prisma_1.prisma.stockMovement.create({
                    data: {
                        dataItemId: item.dataItemId,
                        type: 'RELEASED',
                        quantity: item.quantity,
                        reason: `Comandă anulată #${orderId.slice(-6)}`,
                        orderId: orderId
                    }
                });
            }
            console.log(`Reserved stock released for cancelled order ${orderId}`);
        }
        catch (error) {
            console.error('Error releasing reserved stock:', error);
            throw new Error('Failed to release reserved stock');
        }
    }
    // Rezervă stoc pentru o comandă nouă
    async reserveStockForOrder(orderId) {
        try {
            const order = await prisma_1.prisma.order.findUnique({
                where: { id: orderId },
                include: {
                    orderItems: {
                        include: {
                            dataItem: true
                        }
                    }
                }
            });
            if (!order) {
                throw new Error('Order not found');
            }
            // Rezervă stocul pentru fiecare produs
            for (const item of order.orderItems) {
                const product = await prisma_1.prisma.dataItem.findUnique({
                    where: { id: item.dataItemId }
                });
                if (!product) {
                    throw new Error(`Product ${item.dataItemId} not found`);
                }
                // Verifică dacă există suficient stoc disponibil
                if (product.availableStock < item.quantity) {
                    throw new Error(`Insufficient stock for product ${product.title}`);
                }
                await prisma_1.prisma.dataItem.update({
                    where: { id: item.dataItemId },
                    data: {
                        // Crește stocul rezervat
                        reservedStock: { increment: item.quantity },
                        // Scade stocul disponibil
                        availableStock: { decrement: item.quantity },
                        // Crește totalul comandat
                        totalOrdered: { increment: item.quantity }
                    }
                });
                // Înregistrează mișcarea de stoc
                await prisma_1.prisma.stockMovement.create({
                    data: {
                        dataItemId: item.dataItemId,
                        type: 'RESERVED',
                        quantity: item.quantity,
                        reason: `Comandă plasată #${orderId.slice(-6)}`,
                        orderId: orderId
                    }
                });
            }
            console.log(`Stock reserved for order ${orderId}`);
        }
        catch (error) {
            console.error('Error reserving stock:', error);
            throw new Error('Failed to reserve stock for order');
        }
    }
    // Verifică dacă un produs este în stoc după o scădere
    async checkIfInStock(productId, quantityToDeduct) {
        const product = await prisma_1.prisma.dataItem.findUnique({
            where: { id: productId },
            select: { stock: true }
        });
        if (!product)
            return false;
        return (product.stock - quantityToDeduct) > 0;
    }
}
exports.AdminSettingsService = AdminSettingsService;
exports.adminSettingsService = new AdminSettingsService();
