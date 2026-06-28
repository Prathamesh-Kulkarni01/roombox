import { getAdminDb } from '@/lib/firebaseAdmin';
import { IJobQueue, JobPayload, QueuedJob } from './JobQueue';

export class FirestoreJobQueue implements IJobQueue {
    private collectionName = 'system_jobs';

    async enqueue(payload: JobPayload): Promise<void> {
        const adminDb = await getAdminDb();
        const jobRef = adminDb.collection(this.collectionName).doc(payload.jobId);
        
        await jobRef.set({
            ...payload,
            status: 'pending',
            createdAt: new Date().toISOString(),
            retryCount: 0
        });
    }

    async dequeue(limit: number): Promise<QueuedJob[]> {
        const adminDb = await getAdminDb();
        const jobsSnapshot = await adminDb.collection(this.collectionName)
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'asc')
            .limit(limit)
            .get();

        if (jobsSnapshot.empty) {
            return [];
        }

        return jobsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                payload: {
                    jobId: data.jobId,
                    type: data.type,
                    targetDomain: data.targetDomain,
                    ownerId: data.ownerId
                },
                retryCount: data.retryCount || 0,
                enqueuedAt: data.createdAt
            };
        });
    }

    async complete(jobId: string): Promise<void> {
        const adminDb = await getAdminDb();
        await adminDb.collection(this.collectionName).doc(jobId).update({
            status: 'completed',
            processedAt: new Date().toISOString()
        });
    }

    async fail(jobId: string, error: string): Promise<void> {
        const adminDb = await getAdminDb();
        await adminDb.collection(this.collectionName).doc(jobId).update({
            status: 'failed',
            error: error,
            processedAt: new Date().toISOString()
        });
    }
}
