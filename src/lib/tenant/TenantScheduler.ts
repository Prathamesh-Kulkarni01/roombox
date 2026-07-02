import { reconcileForOwner } from '@/lib/actions/reconciliationActions';
import { sendRemindersForOwner } from '@/lib/actions/reminderActions';
import { Firestore } from 'firebase-admin/firestore';
import { TenantLock } from './TenantLock';

/**
 * TenantScheduler acts as the autonomous brain for a single isolated Enterprise Tenant.
 * It evaluates the current time and state to decide which background tasks need to run.
 */
export class TenantScheduler {
    private tenantId: string;
    private db: Firestore;
    private now: Date;
    private lock: TenantLock;

    constructor(tenantId: string, db: Firestore, now?: Date) {
        this.tenantId = tenantId;
        this.db = db;
        this.now = now || new Date();
        this.lock = new TenantLock(db, tenantId);
    }

    /**
     * Executes all scheduled jobs that the tenant determines need to be run.
     * This isolates the "What to run" and "When to run" business logic entirely inside the tenant.
     * It is idempotent and locked per tenant.
     */
    async runAllScheduledJobs(jobId: string) {
        console.log(`[TenantScheduler] Waking up to process scheduled jobs for owner: ${this.tenantId}`);
        
        // 1. Idempotency Check
        const historyRef = this.db.collection('job_history').doc(jobId);
        const historyDoc = await historyRef.get();
        if (historyDoc.exists) {
            console.log(`[TenantScheduler] Job ${jobId} already processed for tenant ${this.tenantId}. Skipping.`);
            return { skipped: true, reason: 'Already processed' };
        }

        // 2. Acquire Tenant Lock
        await this.lock.acquireLock();

        const results: Record<string, any> = {};
        let executionError: any = null;

        try {
            // 3. Rent Generation / Ledger Reconciliation
            try {
                console.log(`[TenantScheduler] Running reconciliation for ${this.tenantId}`);
                results.reconciliation = await reconcileForOwner(this.tenantId, undefined, this.now, {
                    tenantScheduled: true,
                });
            } catch (e: any) {
                console.error(`[TenantScheduler] Reconciliation failed for ${this.tenantId}`, e.message);
                results.reconciliation = { success: false, error: e.message };
            }

            // 4. Reminders & Notifications
            try {
                console.log(`[TenantScheduler] Running reminders for ${this.tenantId}`);
                results.reminders = await sendRemindersForOwner(this.tenantId, this.now, {
                    tenantScheduled: true,
                });
            } catch (e: any) {
                console.error(`[TenantScheduler] Reminders failed for ${this.tenantId}`, e.message);
                results.reminders = { success: false, error: e.message };
            }

            // (Future) Invoices, Late Fees, Maintenance Reminders can be added here
            
        } catch (error: any) {
            executionError = error.message;
        } finally {
            // 5. Release Lock
            await this.lock.releaseLock();
            
            // 6. Record Execution History
            await historyRef.set({
                jobId,
                startedAt: this.now.toISOString(),
                completedAt: new Date().toISOString(),
                results,
                error: executionError,
                tenantId: this.tenantId
            });
        }
        
        console.log(`[TenantScheduler] Completed scheduled jobs for owner: ${this.tenantId}`);
        return results;
    }
}
