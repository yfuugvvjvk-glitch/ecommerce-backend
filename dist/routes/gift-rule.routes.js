"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.giftRuleRoutes = giftRuleRoutes;
const auth_middleware_1 = require("../middleware/auth.middleware");
const gift_rule_service_1 = require("../services/gift-rule.service");
// Middleware pentru verificarea rolului de admin
const adminMiddleware = async (request, reply) => {
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
async function giftRuleRoutes(fastify) {
    // Aplicăm middleware-ul de autentificare și admin pentru toate rutele admin
    fastify.addHook('preHandler', auth_middleware_1.authMiddleware);
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
            const rule = await gift_rule_service_1.giftRuleService.createRule(request.body, userId);
            return reply.code(201).send({
                success: true,
                rule
            });
        }
        catch (error) {
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
            const query = request.query;
            const includeInactive = query.includeInactive === 'true' || query.includeInactive === true;
            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 20;
            const rules = await gift_rule_service_1.giftRuleService.getAllRules(includeInactive);
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
        }
        catch (error) {
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
            const { id } = request.params;
            const rule = await gift_rule_service_1.giftRuleService.getRule(id);
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
        }
        catch (error) {
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
            const { id } = request.params;
            const rule = await gift_rule_service_1.giftRuleService.updateRule(id, request.body);
            return reply.send({
                success: true,
                rule
            });
        }
        catch (error) {
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
            const { id } = request.params;
            await gift_rule_service_1.giftRuleService.deleteRule(id);
            return reply.send({
                success: true,
                message: 'Rule deleted successfully'
            });
        }
        catch (error) {
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
            const { id } = request.params;
            const { isActive } = request.body;
            if (typeof isActive !== 'boolean') {
                return reply.code(400).send({
                    success: false,
                    error: {
                        code: 'INVALID_REQUEST',
                        message: 'isActive must be a boolean'
                    }
                });
            }
            const rule = await gift_rule_service_1.giftRuleService.toggleRuleStatus(id, isActive);
            return reply.send({
                success: true,
                rule
            });
        }
        catch (error) {
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
            const { id } = request.params;
            const statistics = await gift_rule_service_1.giftRuleService.getRuleStatistics(id);
            return reply.send({
                success: true,
                statistics
            });
        }
        catch (error) {
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
