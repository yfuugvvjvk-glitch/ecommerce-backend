"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
exports.adminMiddleware = adminMiddleware;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function adminMiddleware(request, reply) {
    try {
        if (!request.user) {
            reply.code(401).send({ error: 'Unauthorized' });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { id: request.user.userId },
        });
        if (!user || user.role !== 'admin') {
            reply.code(403).send({ error: 'Forbidden - Admin access required' });
            return;
        }
    }
    catch (error) {
        reply.code(500).send({ error: 'Internal server error' });
    }
}
exports.requireAdmin = adminMiddleware;
