import cron from 'node-cron';
import { prisma } from '../utils/prisma';

/**
 * Șterge codurile de verificare mai vechi de 24 de ore
 * Runs daily at 2:00 AM
 */
export function scheduleVerificationCleanup() {
  // Rulează în fiecare zi la 02:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Curățare automată coduri de verificare...');
    
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Șterge codurile de verificare mai vechi de 24 de ore
      const deletedCodes = await prisma.verificationCode.deleteMany({
        where: {
          createdAt: {
            lt: twentyFourHoursAgo,
          },
        },
      });
      
      console.log(`✅ Coduri de verificare șterse: ${deletedCodes.count}`);
    } catch (error) {
      console.error('❌ Eroare la ștergerea codurilor de verificare:', error);
    }
  });

  console.log('⏰ Job curățare coduri de verificare programat (zilnic la 02:00)');
}

/**
 * Deblochează conturile cu lockout expirat
 * Runs daily at 3:00 AM
 */
export function scheduleAccountLockoutCleanup() {
  // Rulează în fiecare zi la 03:00 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('🔓 Deblocare automată conturi...');
    
    try {
      const now = new Date();
      
      // Găsește toate lockout-urile expirate care nu au fost deblocate
      const expiredLockouts = await prisma.accountLockout.findMany({
        where: {
          expiresAt: {
            lt: now,
          },
          unlocked: false,
        },
      });
      
      // Deblochează fiecare cont expirat
      for (const lockout of expiredLockouts) {
        await prisma.accountLockout.update({
          where: { id: lockout.id },
          data: {
            unlocked: true,
            unlockedAt: now,
          },
        });
      }
      
      console.log(`✅ Conturi deblocate: ${expiredLockouts.length}`);
    } catch (error) {
      console.error('❌ Eroare la deblocarea conturilor:', error);
    }
  });

  console.log('⏰ Job deblocare conturi programat (zilnic la 03:00)');
}

/**
 * Șterge utilizatorii în așteptare (pending) mai vechi de 24 de ore
 * Runs daily at 4:00 AM
 */
export function schedulePendingUserCleanup() {
  // Rulează în fiecare zi la 04:00 AM
  cron.schedule('0 4 * * *', async () => {
    console.log('🧹 Curățare automată utilizatori în așteptare...');
    
    try {
      const now = new Date();
      
      // Șterge utilizatorii în așteptare cu expiresAt în trecut
      const deletedUsers = await prisma.pendingUser.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });
      
      console.log(`✅ Utilizatori în așteptare șterși: ${deletedUsers.count}`);
    } catch (error) {
      console.error('❌ Eroare la ștergerea utilizatorilor în așteptare:', error);
    }
  });

  console.log('⏰ Job curățare utilizatori în așteptare programat (zilnic la 04:00)');
}
