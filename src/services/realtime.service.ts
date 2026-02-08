import { FastifyInstance } from 'fastify';

export class RealtimeService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  // Broadcast actualizări inventar
  broadcastInventoryUpdate(productId: string, data: {
    stock: number;
    reservedStock: number;
    availableStock: number;
    lastUpdated: Date;
    productTitle?: string;
    unitName?: string;
    price?: number;
  }) {
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
  broadcastFinancialUpdate(data: {
    totalRevenue: number;
    todayRevenue: number;
    transactionCount: number;
  }) {
    if (this.fastify.io) {
      this.fastify.io.emit('financial_update', {
        ...data,
        timestamp: new Date()
      });
    }
  }

  // Broadcast actualizări comenzi
  broadcastOrderUpdate(orderId: string, status: string, data: any) {
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
  broadcastNewOrder(order: any) {
    if (this.fastify.io) {
      this.fastify.io.emit('new_order', {
        order,
        timestamp: new Date()
      });
      
      console.log(`🆕 Broadcasting new order: ${order.id} - ${order.total} RON`);
    }
  }

  // Broadcast alerte stoc scăzut
  broadcastLowStockAlert(productId: string, productName: string, currentStock: number, threshold: number) {
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
  broadcastContentUpdate(data: any) {
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
  broadcastDeliveryLocationUpdate(data: any) {
    if (this.fastify.io) {
      this.fastify.io.emit('delivery_location_update', {
        ...data,
        timestamp: new Date()
      });
      console.log(`🚚 Broadcasting delivery location update: ${data.type}`);
    }
  }

  // Broadcast actualizări configurații site
  broadcastConfigUpdate(data: any) {
    if (this.fastify.io) {
      this.fastify.io.emit('config_update', {
        ...data,
        timestamp: new Date()
      });
      console.log(`⚙️ Broadcasting config update: ${data.key}`);
    }
  }

  // Broadcast activitate utilizatori
  broadcastUserActivity(data: any) {
    if (this.fastify.io) {
      this.fastify.io.emit('user_activity', {
        ...data,
        timestamp: new Date()
      });
      console.log(`👤 Broadcasting user activity: ${data.type}`);
    }
  }

  // Broadcast notificări sistem
  broadcastSystemNotification(data: any) {
    if (this.fastify.io) {
      this.fastify.io.emit('system_notification', {
        ...data,
        timestamp: new Date()
      });
      console.log(`🔔 Broadcasting system notification: ${data.title}`);
    }
  }

  // Trimite notificare către utilizator specific
  sendUserNotification(userId: string, notification: any) {
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
  broadcastLiveStats(stats: any) {
    if (this.fastify.io) {
      this.fastify.io.emit('live_stats', {
        ...stats,
        timestamp: new Date()
      });
    }
  }

  // Obține numărul de clienți conectați
  getConnectedClientsCount(): number {
    return this.fastify.io ? Object.keys(this.fastify.io.sockets.sockets).length : 0;
  }
}

export let realtimeService: RealtimeService;

export function initializeRealtimeService(fastify: FastifyInstance) {
  realtimeService = new RealtimeService(fastify);
  return realtimeService;
}