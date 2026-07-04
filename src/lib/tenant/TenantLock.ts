import { Firestore, Transaction } from 'firebase-admin/firestore';

export class TenantLock {
    private db: Firestore;
    private tenantId: string;
    private get lockDocId() { return `cron_execution_${this.tenantId}`; }
    private lockCollection = 'system_locks';

    constructor(db: Firestore, tenantId: string) {
        this.db = db;
        this.tenantId = tenantId;
    }

    /**
     * Attempts to acquire the execution lock for this tenant.
     * Throws an error if the lock is already held and not expired.
     */
    async acquireLock(timeoutMinutes: number = 10): Promise<void> {
        const lockRef = this.db.collection(this.lockCollection).doc(this.lockDocId);

        await this.db.runTransaction(async (transaction: Transaction) => {
            const lockDoc = await transaction.get(lockRef);
            const now = new Date();

            if (lockDoc.exists) {
                const data = lockDoc.data();
                if (data && data.status === 'locked') {
                    const expiresAt = new Date(data.expiresAt);
                    if (now < expiresAt) {
                        throw new Error(`Lock already held for tenant ${this.tenantId}. Expires at ${expiresAt.toISOString()}`);
                    }
                    // If the lock has expired, we can overwrite it.
                    console.log(`[TenantLock] Previous lock for ${this.tenantId} expired. Reclaiming.`);
                }
            }

            const expiresAt = new Date(now.getTime() + timeoutMinutes * 60 * 1000);
            transaction.set(lockRef, {
                status: 'locked',
                ownerId: this.tenantId,
                acquiredAt: now.toISOString(),
                expiresAt: expiresAt.toISOString()
            });
        });
        
        console.log(`[TenantLock] Lock acquired for tenant ${this.tenantId}`);
    }

    /**
     * Releases the lock. Should be called in a finally block.
     */
    async releaseLock(): Promise<void> {
        const lockRef = this.db.collection(this.lockCollection).doc(this.lockDocId);
        await lockRef.update({
            status: 'released',
            releasedAt: new Date().toISOString()
        }).catch(err => {
            console.error(`[TenantLock] Failed to release lock for ${this.tenantId}`, err.message);
        });
        console.log(`[TenantLock] Lock released for tenant ${this.tenantId}`);
    }
}
