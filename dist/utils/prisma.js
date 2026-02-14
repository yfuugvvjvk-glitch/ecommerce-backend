"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.verifyDatabaseConnection = verifyDatabaseConnection;
exports.disconnectDatabase = disconnectDatabase;
const client_1 = require("@prisma/client");
const globalForPrisma = global;
exports.prisma = globalForPrisma.prisma ||
    new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        errorFormat: 'pretty',
    });
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
// Verifică conexiunea la baza de date
async function verifyDatabaseConnection() {
    try {
        await exports.prisma.$connect();
        await exports.prisma.$queryRaw `SELECT 1`;
        console.log('✅ Conexiune la baza de date stabilită cu succes');
        return true;
    }
    catch (error) {
        console.error('❌ Eroare la conexiunea cu baza de date:', error);
        return false;
    }
}
// Graceful shutdown
async function disconnectDatabase() {
    try {
        await exports.prisma.$disconnect();
        console.log('✅ Conexiune la baza de date închisă');
    }
    catch (error) {
        console.error('❌ Eroare la închiderea conexiunii:', error);
    }
}
