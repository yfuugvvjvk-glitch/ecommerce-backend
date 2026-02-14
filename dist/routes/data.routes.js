"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataRoutes = dataRoutes;
const data_service_1 = require("../services/data.service");
const data_schema_1 = require("../schemas/data.schema");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const dataService = new data_service_1.DataService();
async function dataRoutes(fastify) {
    // GET /api/data - List all data items with pagination (PUBLIC)
    fastify.get('/', async (request, reply) => {
        try {
            const query = data_schema_1.QueryParamsSchema.parse(request.query);
            // Try to get user info from token if available
            let userId = null;
            let userRole = 'user';
            try {
                // Attempt to verify JWT token if present
                await request.jwtVerify();
                userId = request.user?.userId || null;
                userRole = request.user?.role || 'user';
            }
            catch (error) {
                // No valid token, continue as guest
                userId = null;
                userRole = 'user';
            }
            const result = await dataService.findAll(userId, userRole, query);
            reply.send(result);
        }
        catch (error) {
            if (error instanceof Error) {
                reply.code(400).send({ error: error.message });
            }
            else {
                reply.code(500).send({ error: 'Internal server error' });
            }
        }
    });
    // GET /api/data/:id - Get single data item (PUBLIC)
    fastify.get('/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            // Try to get user info from token if available
            let userId = null;
            let userRole = 'user';
            try {
                // Attempt to verify JWT token if present
                await request.jwtVerify();
                userId = request.user?.userId || null;
                userRole = request.user?.role || 'user';
            }
            catch (error) {
                // No valid token, continue as guest
                userId = null;
                userRole = 'user';
            }
            const item = await dataService.findById(id, userId, userRole);
            if (!item) {
                reply.code(404).send({ error: 'Data item not found' });
                return;
            }
            reply.send({ data: item });
        }
        catch (error) {
            if (error instanceof Error) {
                reply.code(400).send({ error: error.message });
            }
            else {
                reply.code(500).send({ error: 'Internal server error' });
            }
        }
    });
    // POST /api/data - Create new data item (REQUIRES AUTH)
    fastify.post('/', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            console.log('📦 POST /api/data - Creating product...');
            console.log('Request body:', JSON.stringify(request.body, null, 2));
            const body = data_schema_1.CreateDataSchema.parse(request.body);
            const userId = request.user.userId;
            // Convert null to undefined for TypeScript compatibility
            const cleanedBody = {
                ...body,
                oldPrice: body.oldPrice === null ? undefined : body.oldPrice,
                expirationDate: body.expirationDate === null ? undefined : body.expirationDate,
                productionDate: body.productionDate === null ? undefined : body.productionDate,
                deliveryTimeHours: body.deliveryTimeHours === null ? undefined : body.deliveryTimeHours,
                deliveryTimeDays: body.deliveryTimeDays === null ? undefined : body.deliveryTimeDays,
            };
            const item = await dataService.create(cleanedBody, userId);
            reply.code(201).send({ data: item });
        }
        catch (error) {
            console.error('❌ Error creating product:', error);
            if (error instanceof Error) {
                console.error('Error message:', error.message);
                console.error('Error name:', error.name);
                reply.code(400).send({ error: error.message });
            }
            else {
                reply.code(500).send({ error: 'Internal server error' });
            }
        }
    });
    // PUT /api/data/:id - Update data item (REQUIRES AUTH)
    fastify.put('/:id', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { id } = request.params;
            console.log('PUT /api/data/:id - Request body:', JSON.stringify(request.body, null, 2));
            const body = data_schema_1.UpdateDataSchema.parse(request.body);
            const userId = request.user.userId;
            // Convert null to undefined for TypeScript compatibility
            const cleanedBody = {
                ...body,
                oldPrice: body.oldPrice === null ? undefined : body.oldPrice,
                expirationDate: body.expirationDate === null ? undefined : body.expirationDate,
                productionDate: body.productionDate === null ? undefined : body.productionDate,
                deliveryTimeHours: body.deliveryTimeHours === null ? undefined : body.deliveryTimeHours,
                deliveryTimeDays: body.deliveryTimeDays === null ? undefined : body.deliveryTimeDays,
            };
            console.log('Cleaned body:', JSON.stringify(cleanedBody, null, 2));
            const item = await dataService.update(id, cleanedBody, userId);
            reply.send({ data: item });
        }
        catch (error) {
            console.error('Error in PUT /api/data/:id:', error);
            if (error instanceof Error) {
                if (error.name === 'NotFoundError') {
                    reply.code(404).send({ error: error.message });
                }
                else {
                    console.error('Validation or other error:', error.message);
                    reply.code(400).send({ error: error.message });
                }
            }
            else {
                reply.code(500).send({ error: 'Internal server error' });
            }
        }
    });
    // DELETE /api/data/:id - Delete data item (REQUIRES AUTH)
    fastify.delete('/:id', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { id } = request.params;
            const userId = request.user.userId;
            const userRole = request.user.role;
            await dataService.delete(id, userId, userRole);
            reply.send({ message: 'Data item deleted successfully' });
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.name === 'NotFoundError') {
                    reply.code(404).send({ error: error.message });
                }
                else if (error.message.includes('Unauthorized')) {
                    reply.code(403).send({ error: error.message });
                }
                else {
                    reply.code(400).send({ error: error.message });
                }
            }
            else {
                reply.code(500).send({ error: 'Internal server error' });
            }
        }
    });
    // POST /api/data/upload-image - Upload product image (REQUIRES AUTH)
    fastify.post('/upload-image', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const uploadedFile = await (0, upload_middleware_1.uploadProductImage)(request, reply);
            reply.send({
                message: 'Image uploaded successfully',
                url: uploadedFile.url,
            });
        }
        catch (error) {
            if (!reply.sent) {
                reply.code(400).send({ error: error.message });
            }
        }
    });
}
