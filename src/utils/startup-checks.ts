import { verifyDatabaseConnection } from './prisma';
import { validateEnv } from './env-validator';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function runStartupChecks(): Promise<boolean> {
  console.log('🔍 Rulare verificări de pornire...\n');
  
  let allChecksPassed = true;

  // 1. Verifică variabilele de mediu
  try {
    console.log('1️⃣  Verificare variabile de mediu...');
    validateEnv();
    console.log('   ✅ Variabile de mediu valide\n');
  } catch (error) {
    console.error('   ❌ Variabile de mediu invalide\n');
    allChecksPassed = false;
  }

  // 2. Verifică conexiunea la baza de date
  try {
    console.log('2️⃣  Verificare conexiune bază de date...');
    const dbConnected = await verifyDatabaseConnection();
    if (dbConnected) {
      console.log('   ✅ Conexiune la baza de date stabilită\n');
    } else {
      console.error('   ❌ Nu se poate conecta la baza de date\n');
      allChecksPassed = false;
    }
  } catch (error) {
    console.error('   ❌ Eroare la verificarea bazei de date:', error);
    allChecksPassed = false;
  }

  // 3. Verifică dacă Prisma Client este generat
  try {
    console.log('3️⃣  Verificare Prisma Client...');
    const prismaClientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
    if (fs.existsSync(prismaClientPath)) {
      console.log('   ✅ Prisma Client generat\n');
    } else {
      console.log('   ⚠️  Prisma Client nu este generat, generare...');
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('   ✅ Prisma Client generat cu succes\n');
    }
  } catch (error) {
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
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`   📁 Creat director: ${dir}`);
      }
    }
    console.log('   ✅ Toate directoarele de upload există\n');
  } catch (error) {
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
      const fullPath = path.join(process.cwd(), route);
      if (!fs.existsSync(fullPath)) {
        console.error(`   ❌ Lipsește fișierul: ${route}`);
        missingRoutes = true;
      }
    }

    if (!missingRoutes) {
      console.log('   ✅ Toate fișierele de rute critice există\n');
    } else {
      allChecksPassed = false;
    }
  } catch (error) {
    console.error('   ❌ Eroare la verificarea fișierelor de rute:', error);
    allChecksPassed = false;
  }

  // Rezultat final
  console.log('═══════════════════════════════════════════');
  if (allChecksPassed) {
    console.log('✅ Toate verificările au trecut cu succes!');
  } else {
    console.log('❌ Unele verificări au eșuat!');
  }
  console.log('═══════════════════════════════════════════\n');

  return allChecksPassed;
}
