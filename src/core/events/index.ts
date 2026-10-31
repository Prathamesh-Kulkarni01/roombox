export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

export interface DomainEvent<T = any> {
  eventId: string;
  moduleId: string;
  eventType: string;
  tenantId: string;
  payload: T;
  timestamp: string;
  priority?: EventPriority;
  metadata?: Record<string, any>;
}

export type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void>;

export class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  /**
   * Subscribe to a domain event across any module
   * e.g. subscribe('bazar:ORDER_PLACED', handleOrderPlaced)
   */
  subscribe<T>(eventType: string, handler: EventHandler<T>): () => void {
    const list = this.handlers.get(eventType) || [];
    list.push(handler as EventHandler);
    this.handlers.set(eventType, list);

    return () => {
      const current = this.handlers.get(eventType) || [];
      this.handlers.set(eventType, current.filter(h => h !== handler));
    };
  }

  /**
   * Publish an event to registered domain listeners
   */
  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const specificHandlers = this.handlers.get(event.eventType) || [];
    const wildcardHandlers = this.handlers.get('*') || [];
    const moduleWildcard = this.handlers.get(`${event.moduleId}:*`) || [];

    const all = [...specificHandlers, ...wildcardHandlers, ...moduleWildcard];

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EventBus] Dispatched [${event.moduleId}] ${event.eventType} to ${all.length} handlers`);
    }

    await Promise.allSettled(all.map(fn => fn(event)));
  }
}

export const eventBus = new EventBus();

