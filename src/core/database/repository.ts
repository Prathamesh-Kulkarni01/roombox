import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  Timestamp,
  type Firestore,
  type QueryConstraint
} from 'firebase/firestore';
import { db } from '@/core/database';
import type { BaseEntity } from './schema';

export interface RepositoryOptions {
  collectionName: string;
  schemaVersion: number;
  dbInstance?: Firestore | null;
}

/**
 * ModularBaseRepository
 * Provides unified schema versioning, resilient defaults, and data isolation across all modules.
 */
export class ModularBaseRepository<T extends BaseEntity> {
  protected collectionName: string;
  protected schemaVersion: number;
  protected customDb?: Firestore | null;

  constructor(options: RepositoryOptions) {
    this.collectionName = options.collectionName;
    this.schemaVersion = options.schemaVersion;
    this.customDb = options.dbInstance;
  }

  protected getDb(): Firestore {
    const active = this.customDb || db;
    if (!active) {
      throw new Error(`[ModularBaseRepository] Firestore instance not initialized for collection ${this.collectionName}`);
    }
    return active;
  }

  async findById(id: string): Promise<T | null> {
    const snap = await getDoc(doc(this.getDb(), this.collectionName, id));
    if (!snap.exists()) return null;
    const data = snap.data() as T;
    return {
      ...data,
      id: snap.id,
      schemaVersion: data.schemaVersion ?? this.schemaVersion,
    };
  }

  async findMany(constraints: QueryConstraint[] = []): Promise<T[]> {
    const q = query(collection(this.getDb(), this.collectionName), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as T;
      return {
        ...data,
        id: d.id,
        schemaVersion: data.schemaVersion ?? this.schemaVersion,
      };
    });
  }

  async create(data: Omit<T, 'id' | 'schemaVersion' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<T> {
    const targetRef = customId 
      ? doc(this.getDb(), this.collectionName, customId)
      : doc(collection(this.getDb(), this.collectionName));

    const now = Timestamp.now();
    const payload = {
      ...data,
      id: targetRef.id,
      schemaVersion: this.schemaVersion,
      createdAt: now,
      updatedAt: now,
    } as unknown as T;

    await setDoc(targetRef, payload);
    return payload;
  }

  async update(id: string, partial: Partial<T>): Promise<void> {
    const targetRef = doc(this.getDb(), this.collectionName, id);
    await updateDoc(targetRef, {
      ...partial,
      updatedAt: Timestamp.now(),
    });
  }
}

