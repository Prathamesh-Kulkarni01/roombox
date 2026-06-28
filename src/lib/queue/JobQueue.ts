export interface JobPayload {
    jobId: string;
    type: string;
    targetDomain: string;
    ownerId: string;
    [key: string]: any;
}

export interface QueuedJob {
    id: string; // The queue document ID
    payload: JobPayload;
    retryCount: number;
    enqueuedAt: string;
}

export interface IJobQueue {
    enqueue(payload: JobPayload): Promise<void>;
    dequeue(limit: number): Promise<QueuedJob[]>;
    complete(jobId: string): Promise<void>;
    fail(jobId: string, error: string): Promise<void>;
}
