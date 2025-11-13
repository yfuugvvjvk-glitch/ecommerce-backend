import { FastifyInstance } from 'fastify';
import { AdminService } from '../services/admin.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { prisma } from '../utils/prisma';

const adminService = new AdminService();

export async function adminRoutes(fastify: FastifyInstance) {
  // All routes require auth + admin
  const preHandler = [authMiddleware, adminMiddleware];

  // Dashboard stats
  fastify.get('/stats', { preHandler }, async (request, reply) => {
    try {
      const stats = await adminService.getDashboardStats();
      reply.send(stats);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get stats' });
    }
  });

  // Users
  fastify.get('/users', { preHandler }, async (request, reply) => {
    try {
      const { page, limit } = request.query as any;
      const users = await adminService.getAllUsers(
        parseInt(page) || 1,
        parseInt(limit) || 20
      );
      reply.send(users);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get users' });
    }
  });

  fastify.put('/users/:id/role', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { role } = request.body as any;
      const user = await adminService.updateUserRole(id, role);
      reply.send(user);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.delete('/users/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      await adminService.deleteUser(id);
      reply.send({ message: 'User deleted' });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Orders
  fastify.get('/orders', { preHandler }, async (request, reply) => {
    try {
      const { page, limit, status } = request.query as any;
      const orders = await adminService.getAllOrders(
        parseInt(page) || 1,
        parseInt(limit) || 20,
        status
      );
      reply.send(orders);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get orders' });
    }
  });

  fastify.put('/orders/:id/status', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { status } = request.body as any;
      const order = await adminService.updateOrderStatus(id, status);
      reply.send(order);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.delete('/orders/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      await adminService.deleteOrder(id);
      reply.send({ message: 'Order deleted' });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Vouchers
  fastify.post('/vouchers', { preHandler }, async (request, reply) => {
    try {
      const data = request.body as any;
      const voucher = await adminService.createVoucher({
        ...data,
        createdById: request.user!.userId,
      });
      reply.code(201).send(voucher);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.get('/vouchers', { preHandler }, async (request, reply) => {
    try {
      const vouchers = await adminService.getAllVouchers();
      reply.send(vouchers);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get vouchers' });
    }
  });

  fastify.put('/vouchers/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = request.body as any;
      const voucher = await adminService.updateVoucher(id, data);
      reply.send(voucher);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.delete('/vouchers/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      await adminService.deleteVoucher(id);
      reply.send({ message: 'Voucher deleted' });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Voucher requests
  fastify.get('/voucher-requests', { preHandler }, async (request, reply) => {
    try {
      const requests = await adminService.getAllVoucherRequests();
      reply.send(requests);
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to get voucher requests' });
    }
  });

  fastify.post('/voucher-requests/:id/approve', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const voucher = await adminService.approveVoucherRequest(id);
      reply.send({ message: 'Voucher request approved', voucher });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.post('/voucher-requests/:id/reject', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      await adminService.rejectVoucherRequest(id);
      reply.send({ message: 'Voucher request rejected' });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.post('/voucher-requests/:id/reset', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      await adminService.resetVoucherRequest(id);
      reply.send({ message: 'Voucher request reset to pending' });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.put('/voucher-requests/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = request.body as any;
      const updated = await adminService.updateVoucherRequest(id, data);
      reply.send(updated);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.delete('/voucher-requests/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      await adminService.deleteVoucherRequest(id);
      reply.send({ message: 'Voucher request deleted' });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Cleanup - Run cleanup tasks manually
  fastify.post('/cleanup', { preHandler }, async (request, reply) => {
    try {
      const { runCleanupNow } = await import('../jobs/cleanup.job');
      const results = await runCleanupNow();
      reply.send({
        message: 'Cleanup completed successfully',
        results,
      });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // Upload offer image
  fastify.post('/offers/upload-image', { preHandler }, async (request, reply) => {
    try {
      const { uploadOfferImage } = await import('../middleware/upload.middleware');
      const uploadedFile = await uploadOfferImage(request, reply);
      reply.send({
        message: 'Image uploaded successfully',
        url: uploadedFile.url,
      });
    } catch (error: any) {
      if (!reply.sent) {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  // Offers
  fastify.get('/offers', { preHandler }, async (request, reply) => {
    try {
      const offers = await prisma.offer.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          products: {
            select: {
              dataItemId: true,
            },
          },
        },
      });
      
      // Transform to include productIds array
      const offersWithProductIds = offers.map(offer => ({
        ...offer,
        productIds: offer.products.map(p => p.dataItemId),
        products: undefined, // Remove the products relation from response
      }));
      
      reply.send(offersWithProductIds);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get offers' });
    }
  });

  fastify.post('/offers', { preHandler }, async (request, reply) => {
    try {
      const data = request.body as any;
      const { productIds, ...offerData } = data;
      
      console.log('Creating offer with productIds:', productIds);
      
      // Validate required fields
      if (!offerData.validUntil) {
        return reply.code(400).send({ error: 'validUntil is required' });
      }

      const offer = await prisma.offer.create({
        data: {
          title: offerData.title,
          description: offerData.description,
          image: offerData.image,
          discount: offerData.discount,
          validUntil: new Date(offerData.validUntil),
          active: offerData.active,
        },
      });

      console.log('Offer created:', offer.id);

      // Link products to offer if specified
      if (productIds && productIds.length > 0) {
        console.log('Linking products to offer:', productIds);
        await prisma.productOffer.createMany({
          data: productIds.map((productId: string) => ({
            offerId: offer.id,
            dataItemId: productId,
          })),
        });
        console.log('Products linked successfully');
      } else {
        console.log('No products to link');
      }

      reply.send(offer);
    } catch (error: any) {
      console.error('Error creating offer:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.put('/offers/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = request.body as any;
      const { productIds, ...offerData } = data;
      
      console.log('Updating offer:', id, 'with productIds:', productIds);
      
      const offerUpdateData: any = {
        title: offerData.title,
        description: offerData.description,
        image: offerData.image,
        discount: offerData.discount,
        active: offerData.active,
      };

      if (offerData.validUntil) {
        offerUpdateData.validUntil = new Date(offerData.validUntil);
      }

      const offer = await prisma.offer.update({
        where: { id },
        data: offerUpdateData,
      });

      console.log('Offer updated, now updating product links');

      // Update product links
      // First, delete existing links
      await prisma.productOffer.deleteMany({
        where: { offerId: id },
      });

      console.log('Existing product links deleted');

      // Then create new links if specified
      if (productIds && productIds.length > 0) {
        console.log('Creating new product links:', productIds);
        await prisma.productOffer.createMany({
          data: productIds.map((productId: string) => ({
            offerId: id,
            dataItemId: productId,
          })),
        });
        console.log('New product links created');
      } else {
        console.log('No products to link');
      }

      reply.send(offer);
    } catch (error: any) {
      console.error('Error updating offer:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.delete('/offers/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      await prisma.offer.delete({ where: { id } });
      reply.send({ message: 'Offer deleted' });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });
}
