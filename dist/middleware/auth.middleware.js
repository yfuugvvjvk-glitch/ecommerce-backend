"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
exports.authMiddleware = authMiddleware;
const auth_1 = require("../utils/auth");
async function authMiddleware(request, reply) {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            reply.code(401).send({ error: 'No token provided' });
            return;
        }
        const token = authHeader.substring(7);
        const payload = (0, auth_1.verifyToken)(token);
        request.user = {
            userId: payload.userId,
            email: payload.email,
            role: payload.role || 'user',
        };
    }
    catch (error) {
        reply.code(401).send({ error: 'Invalid or expired token' });
    }
}
exports.authenticateToken = authMiddleware;
