"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.giftPublicRoutes = giftPublicRoutes;
const gift_rule_service_1 = require("../services/gift-rule.service");
async function giftPublicRoutes(fastify) {
    // GET /api/gift-rules/active - Returnează regulile active (pentru afișare publică)
    fastify.get('/active', async (request, reply) => {
        try {
            const rules = await gift_rule_service_1.giftRuleService.getActiveRules();
            // Returnează doar informații publice (fără detalii sensibile despre condiții)
            const publicRules = rules.map((rule) => ({
                id: rule.id,
                name: rule.name,
                description: rule.description,
                priority: rule.priority,
            }));
            return reply.send({
                success: true,
                rules: publicRules,
            });
        }
        catch (error) {
            console.error('Error fetching active gift rules:', error);
            return reply.code(500).send({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error.message || 'Failed to fetch active gift rules',
                },
            });
        }
    });
}
