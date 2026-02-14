"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStartupChecks = runStartupChecks;
const prisma_1 = require("./prisma");
const env_validator_1 = require("./env-validator");
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function runStartupChecks() {
    console.log('🔍 Rulare verificări de pornire...\n');
    let allChecksPassed = true;
    // 1. Verifică variabilele de mediu
    try {
        console.log('1️⃣  Verificare variabile de mediu...');
        (0, env_validator_1.validateEnv)();
        console.log('   ✅ Variabile de mediu valide\n');
    }
    catch (error) {
        console.error('   ❌ Variabile de mediu invalide\n');
        allChecksPassed = false;
    }
    // 2. Verifică conexiunea la baza de date
    try {
        console.log('2️⃣  Verificare conexiune bază de date...');
        const dbConnected = await (0, prisma_1.verifyDatabaseConnection)();
        if (dbConnected) {
            console.log('   ✅ Conexiune la baza de date stabilită\n');
        }
        else {
            console.error('   ❌ Nu se poate conecta la baza de date\n');
            allChecksPassed = false;
        }
    }
    catch (error) {
        console.error('   ❌ Eroare la verificarea bazei de date:', error);
        allChecksPassed = false;
    }
    // 3. Verifică dacă Prisma Client este generat
    try {
        console.log('3️⃣  Verificare Prisma Client...');
        const prismaClientPath = path_1.default.join(process.cwd(), 'node_modules', '.prisma', 'client');
        if (fs_1.default.existsSync(prismaClientPath)) {
            console.log('   ✅ Prisma Client generat\n');
        }
        else {
            console.log('   ⚠️  Prisma Client nu este generat, generare...');
            (0, child_process_1.execSync)('npx prisma generate', { stdio: 'inherit' });
            console.log('   ✅ Prisma Client generat cu succes\n');
        }
    }
    catch (error) {
        console.error('   ❌ Eroare la verificarea/generarea Prisma Client:', error);
        allChecksPassed = false;
    }
    // 4. Verifică directoarele pentru upload-uri
    try {
        console.log('4️⃣  Verificare directoare upload...');
        const uploadDirs = [
            'public/uploads',
            'public/uploads/products',
            'public/uploads/avatars',
            'public/uploads/offers',
            'public/uploads/media',
        ];
        for (const dir of uploadDirs) {
            const fullPath = path_1.default.join(process.cwd(), dir);
            if (!fs_1.default.existsSync(fullPath)) {
                fs_1.default.mkdirSync(fullPath, { recursive: true });
                console.log(`   📁 Creat director: ${dir}`);
            }
        }
        console.log('   ✅ Toate directoarele de upload există\n');
    }
    catch (error) {
        console.error('   ❌ Eroare la verificarea directoarelor:', error);
        allChecksPassed = false;
    }
    // 5. Verifică fișierele de rute critice
    try {
        console.log('5️⃣  Verificare fișiere rute...');
        const criticalRoutes = [
            'src/routes/auth.routes.ts',
            'src/routes/data.routes.ts',
            'src/routes/cart.routes.ts',
            'src/routes/order.routes.ts',
        ];
        let missingRoutes = false;
        for (const route of criticalRoutes) {
            const fullPath = path_1.default.join(process.cwd(), route);
            if (!fs_1.default.existsSync(fullPath)) {
                console.error(`   ❌ Lipsește fișierul: ${route}`);
                missingRoutes = true;
            }
        }
        if (!missingRoutes) {
            console.log('   ✅ Toate fișierele de rute critice există\n');
        }
        else {
            allChecksPassed = false;
        }
    }
    catch (error) {
        console.error('   ❌ Eroare la verificarea fișierelor de rute:', error);
        allChecksPassed = false;
    }
    // Rezultat final
    console.log('═══════════════════════════════════════════');
    if (allChecksPassed) {
        console.log('✅ Toate verificările au trecut cu succes!');
    }
    else {
        console.log('❌ Unele verificări au eșuat!');
    }
    console.log('═══════════════════════════════════════════\n');
    return allChecksPassed;
}
