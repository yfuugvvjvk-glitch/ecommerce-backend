import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.middleware';
import { giftRuleService } from '../services/gift-rule.service';

// Middleware pentru verificarea rolului de admin
const adminMiddleware = async (request: any, reply: any) => {
  if (request.user?.role !== 'admin') {
    return reply.code(403).send({ 
      success: false,
      error: { 
        code: 'FORBIDDEN', 
        message: 'Access denied. Admin role required.' 
      } 
    });
  }
};

export async function giftRuleRoutes(fastify: FastifyInstance) {
  // Aplicăm middleware-ul de autentificare și admin pentru toate rutele admin
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', adminMiddleware);

  // POST /api/admin/gift-rules - Creează o regulă nouă
  fastify.post('/', async (request, reply) => {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
        });
      }

      const rule = await giftRuleService.createRule(request.body as any, userId);
      
      return reply.code(201).send({
        success: true,
        rule
      });
    } catch (error: any) {
      console.error('Error creating gift rule:', error);
      return reply.code(400).send({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: error.message || 'Failed to create gift rule'
        }
      });
    }
  });

  // GET /api/admin/gift-rules - Listează toate regulile cu paginare
  fastify.get('/', async (request, reply) => {
    try {
      const query = request.query as any;
      const includeInactive = query.includeInactive === 'true' || query.includeInactive === true;
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 20;

      const rules = await giftRuleService.getAllRules(includeInactive);

      // Aplicăm paginarea manual
      const total = rules.length;
      const totalPages = Math.ceil(total / limit);
      const skip = (page - 1) * limit;
      const paginatedRules = rules.slice(skip, skip + limit);

      return reply.send({
        success: true,
        rules: paginatedRules,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      });
    } catch (error: any) {
      console.error('Error fetching gift rules:', error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch gift rules'
        }
      });
    }
  });

  // GET /api/admin/gift-rules/:id - Obține o regulă specifică
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const rule = await giftRuleService.getRule(id);

      if (!rule) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Gift rule not found'
          }
        });
      }

      return reply.send({
        success: true,
        rule
      });
    } catch (error: any) {
      console.error('Error fetching gift rule:', error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch gift rule'
        }
      });
    }
  });

  // PUT /api/admin/gift-rules/:id - Actualizează o regulă
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const rule = await giftRuleService.updateRule(id, request.body as any);

      return reply.send({
        success: true,
        rule
      });
    } catch (error: any) {
      console.error('Error updating gift rule:', error);
      
      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Gift rule not found'
          }
        });
      }

      return reply.code(400).send({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: error.message || 'Failed to update gift rule'
        }
      });
    }
  });

  // DELETE /api/admin/gift-rules/:id - Șterge o regulă
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await giftRuleService.deleteRule(id);

      return reply.send({
        success: true,
        message: 'Rule deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting gift rule:', error);
      
      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Gift rule not found'
          }
        });
      }

      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to delete gift rule'
        }
      });
    }
  });

  // PATCH /api/admin/gift-rules/:id/toggle - Activează/dezactivează o regulă
  fastify.patch('/:id/toggle', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { isActive } = request.body as { isActive: boolean };

      if (typeof isActive !== 'boolean') {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'isActive must be a boolean'
          }
        });
      }

      const rule = await giftRuleService.toggleRuleStatus(id, isActive);

      return reply.send({
        success: true,
        rule
      });
    } catch (error: any) {
      console.error('Error toggling gift rule status:', error);
      
      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Gift rule not found'
          }
        });
      }

      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to toggle gift rule status'
        }
      });
    }
  });

  // GET /api/admin/gift-rules/:id/statistics - Obține statistici pentru o regulă
  fastify.get('/:id/statistics', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const statistics = await giftRuleService.getRuleStatistics(id);

      return reply.send({
        success: true,
        statistics
      });
    } catch (error: any) {
      console.error('Error fetching gift rule statistics:', error);
      
      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Gift rule not found'
          }
        });
      }

      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch statistics'
        }
      });
    }
  });
}
