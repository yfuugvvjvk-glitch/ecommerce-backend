import cron from 'node-cron';
import { CleanupService } from '../services/cleanup.service';

const cleanupService = new CleanupService();

/**
 * Schedule cleanup jobs
 */
export function scheduleCleanupJobs() {
  // Run cleanup every day at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('[Cron] Running daily cleanup job at 3:00 AM');
    try {
      await cleanupService.runAllCleanupTasks();
    } catch (error) {
      console.error('[Cron] Error in cleanup job:', error);
    }
  });

  console.log('[Cron] Cleanup jobs scheduled:');
  console.log('  - Daily cleanup at 3:00 AM (expired vouchers, fully used vouchers, old requests)');
}

/**
 * Run cleanup immediately (for testing or manual trigger)
 */
export async function runCleanupNow() {
  console.log('[Cleanup] Running cleanup tasks immediately...');
  try {
    const results = await cleanupService.runAllCleanupTasks();
    return results;
  } catch (error) {
    console.error('[Cleanup] Error running cleanup:', error);
    throw error;
  }
}
