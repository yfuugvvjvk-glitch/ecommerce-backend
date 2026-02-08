"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const client_1 = require("@prisma/client");
const auth_1 = require("../utils/auth");
const prisma = new client_1.PrismaClient();
class AuthService {
    async register(email, password, name) {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        // Hash password
        const hashedPassword = await (0, auth_1.hashPassword)(password);
        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: 'user',
            },
        });
        return user;
    }
    async login(email, password) {
        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new Error('Invalid email or password');
        }
        // Verify password
        const isValidPassword = await (0, auth_1.comparePassword)(password, user.password);
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }
        // Generate token
        const token = (0, auth_1.generateToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        // Remove password from user object
        const { password: _, ...userWithoutPassword } = user;
        return {
            token,
            user: userWithoutPassword,
        };
    }
    async verifyToken(token) {
        const payload = (0, auth_1.verifyToken)(token);
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }
    async getUserById(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return null;
        }
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
}
exports.AuthService = AuthService;
