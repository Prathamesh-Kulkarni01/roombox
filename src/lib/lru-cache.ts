/**
 * A lightweight LRU Cache for managing Firebase App and Firestore instances.
 * Automatically evicts the least recently used items when max size is reached.
 */
export class LRUCache<K, V> {
    private max: number;
    private cache: Map<K, V>;
    private disposeFn?: (value: V, key: K) => void;

    constructor(max = 100, disposeFn?: (value: V, key: K) => void) {
        this.max = max;
        this.cache = new Map();
        this.disposeFn = disposeFn;
    }

    get(key: K): V | undefined {
        const item = this.cache.get(key);
        if (item) {
            // refresh key
            this.cache.delete(key);
            this.cache.set(key, item);
        }
        return item;
    }

    set(key: K, val: V) {
        // refresh key
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        // evict if needed
        else if (this.cache.size >= this.max) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                const firstVal = this.cache.get(firstKey);
                this.cache.delete(firstKey);
                if (this.disposeFn && firstVal !== undefined) {
                    try {
                        this.disposeFn(firstVal, firstKey);
                    } catch (e) {
                        console.error('[LRUCache] Error disposing evicted item:', e);
                    }
                }
            }
        }
        this.cache.set(key, val);
    }

    has(key: K): boolean {
        return this.cache.has(key);
    }
    
    delete(key: K): boolean {
        const item = this.cache.get(key);
        if (item && this.disposeFn) {
            try {
                this.disposeFn(item, key);
            } catch (e) {
                console.error('[LRUCache] Error disposing deleted item:', e);
            }
        }
        return this.cache.delete(key);
    }
}
