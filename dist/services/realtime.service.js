"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realtimeService = exports.RealtimeService = void 0;
exports.initializeRealtimeService = initializeRealtimeService;
class RealtimeService {
    constructor(fastify) {
        this.fastify = fastify;
    }
    // Broadcast actualizări inventar
    broadcastInventoryUpdate(productId, data) {
        if (this.fastify.io) {
            this.fastify.io.emit('inventory_update', {
                productId,
                ...data,
                timestamp: new Date()
            });
            console.log(`📦 Broadcasting inventory update for ${data.productTitle || productId}: ${data.availableStock} ${data.unitName || 'units'} available`);
        }
    }
    // Broadcast actualizări financiare
    broadcastFinancialUpdate(data) {
        if (this.fastify.io) {
            this.fastify.io.emit('financial_update', {
                ...data,
                timestamp: new Date()
            });
        }
    }
    // Broadcast actualizări comenzi
    broadcastOrderUpdate(orderId, status, data) {
        if (this.fastify.io) {
            this.fastify.io.emit('order_update', {
                orderId,
                status,
                data,
                timestamp: new Date()
            });
            console.log(`📋 Broadcasting order update: ${orderId} -> ${status}`);
        }
    }
    // Broadcast comandă nouă
    broadcastNewOrder(order) {
        if (this.fastify.io) {
            this.fastify.io.emit('new_order', {
                order,
                timestamp: new Date()
            });
            console.log(`🆕 Broadcasting new order: ${order.id} - ${order.total} RON`);
        }
    }
    // Broadcast alerte stoc scăzut
    broadcastLowStockAlert(productId, productName, currentStock, threshold) {
        if (this.fastify.io) {
            this.fastify.io.emit('low_stock_alert', {
                productId,
                productName,
                currentStock,
                threshold,
                timestamp: new Date()
            });
        }
    }
    // Broadcast actualizări conținut (pagini, configurații)
    broadcastContentUpdate(data) {
        if (this.fastify.io) {
            this.fastify.io.emit('content_update', {
                ...data,
                timestamp: new Date()
            });
            // Broadcast specific pentru editarea paginilor în timp real
            if (data.pageId) {
                this.fastify.io.emit('page_live_update', {
                    ...data,
                    timestamp: new Date()
                });
            }
            console.log(`📝 Broadcasting content update: ${data.type}`);
        }
    }
    // Broadcast actualizări locații de livrare
    broadcastDeliveryLocationUpdate(data) {
        if (this.fastify.io) {
            this.fastify.io.emit('delivery_location_update', {
                ...data,
                timestamp: new Date()
            });
            console.log(`🚚 Broadcasting delivery location update: ${data.type}`);
        }
    }
    // Broadcast actualizări configurații site
    broadcastConfigUpdate(data) {
        if (this.fastify.io) {
            this.fastify.io.emit('config_update', {
                ...data,
                timestamp: new Date()
            });
            console.log(`⚙️ Broadcasting config update: ${data.key}`);
        }
    }
    // Broadcast activitate utilizatori
    broadcastUserActivity(data) {
        if (this.fastify.io) {
            this.fastify.io.emit('user_activity', {
                ...data,
                timestamp: new Date()
            });
            console.log(`👤 Broadcasting user activity: ${data.type}`);
        }
    }
    // Broadcast notificări sistem
    broadcastSystemNotification(data) {
        if (this.fastify.io) {
            this.fastify.io.emit('system_notification', {
                ...data,
                timestamp: new Date()
            });
            console.log(`🔔 Broadcasting system notification: ${data.title}`);
        }
    }
    // Trimite notificare către utilizator specific
    sendUserNotification(userId, notification) {
        if (this.fastify.io) {
            this.fastify.io.emit('user_notification', {
                userId,
                ...notification,
                timestamp: new Date()
            });
            console.log(`📬 Sending notification to user ${userId}: ${notification.title}`);
        }
    }
    // Broadcast statistici live
    broadcastLiveStats(stats) {
        if (this.fastify.io) {
            this.fastify.io.emit('live_stats', {
                ...stats,
                timestamp: new Date()
            });
        }
    }
    // Obține numărul de clienți conectați
    getConnectedClientsCount() {
        return this.fastify.io ? Object.keys(this.fastify.io.sockets.sockets).length : 0;
    }
}
exports.RealtimeService = RealtimeService;
function initializeRealtimeService(fastify) {
    exports.realtimeService = new RealtimeService(fastify);
    return exports.realtimeService;
}
