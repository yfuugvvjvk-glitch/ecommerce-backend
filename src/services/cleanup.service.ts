import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CleanupService {
  /**
   * Delete expired vouchers
   * Runs daily to clean up vouchers that have passed their validUntil date
   */
  async deleteExpiredVouchers() {
    const now = new Date();
    
    try {
      const result = await prisma.voucher.deleteMany({
        where: {
          validUntil: {
            lt: now,
          },
        },
      });

      console.log(`[Cleanup] Deleted ${result.count} expired vouchers`);
      return result.count;
    } catch (error) {
      console.error('[Cleanup] Error deleting expired vouchers:', error);
      throw error;
    }
  }

  /**
   * Delete fully used vouchers
   * Removes vouchers where usedCount >= maxUsage (if maxUsage is set)
   */
  async deleteFullyUsedVouchers() {
    try {
      // Find vouchers where usedCount >= maxUsage
      const vouchersToDelete = await prisma.voucher.findMany({
        where: {
          maxUsage: { not: null },
        },
        select: {
          id: true,
          usedCount: true,
          maxUsage: true,
        },
      });

      const idsToDelete = vouchersToDelete
        .filter((v) => v.maxUsage !== null && v.usedCount >= v.maxUsage)
        .map((v) => v.id);

      if (idsToDelete.length === 0) {
        console.log('[Cleanup] No fully used vouchers to delete');
        return 0;
      }

      const result = await prisma.voucher.deleteMany({
        where: {
          id: { in: idsToDelete },
        },
      });

      console.log(`[Cleanup] Deleted ${result.count} fully used vouchers`);
      return result.count;
    } catch (error) {
      console.error('[Cleanup] Error deleting fully used vouchers:', error);
      throw error;
    }
  }

  /**
   * Delete old rejected voucher requests
   * Removes rejected requests older than 30 days
   */
  async deleteOldRejectedRequests() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const result = await prisma.voucherRequest.deleteMany({
        where: {
          status: 'REJECTED',
          updatedAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      console.log(`[Cleanup] Deleted ${result.count} old rejected voucher requests`);
      return result.count;
    } catch (error) {
      console.error('[Cleanup] Error deleting old rejected requests:', error);
      throw error;
    }
  }

  /**
   * Delete old approved voucher requests
   * Removes approved requests older than 90 days (voucher already created)
   */
  async deleteOldApprovedRequests() {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    try {
      const result = await prisma.voucherRequest.deleteMany({
        where: {
          status: 'APPROVED',
          updatedAt: {
            lt: ninetyDaysAgo,
          },
        },
      });

      console.log(`[Cleanup] Deleted ${result.count} old approved voucher requests`);
      return result.count;
    } catch (error) {
      console.error('[Cleanup] Error deleting old approved requests:', error);
      throw error;
    }
  }

  /**
   * Run all cleanup tasks
   */
  async runAllCleanupTasks() {
    console.log('[Cleanup] Starting cleanup tasks...');
    
    const results = {
      expiredVouchers: 0,
      fullyUsedVouchers: 0,
      oldRejectedRequests: 0,
      oldApprovedRequests: 0,
    };

    try {
      results.expiredVouchers = await this.deleteExpiredVouchers();
      results.fullyUsedVouchers = await this.deleteFullyUsedVouchers();
      results.oldRejectedRequests = await this.deleteOldRejectedRequests();
      results.oldApprovedRequests = await this.deleteOldApprovedRequests();

      console.log('[Cleanup] All cleanup tasks completed:', results);
      return results;
    } catch (error) {
      console.error('[Cleanup] Error running cleanup tasks:', error);
      throw error;
    }
  }
}
