export interface EventRecord {
  sequenceNumber: number;
  virtualTime: number;
  eventName: string;
  scenarioId: string;
  correlationId?: string;
  tenantId?: string;
  ownerId?: string;
  payload?: any;
}

export class EventStream {
  private events: EventRecord[] = [];
  private sequence = 0;
  private scenarioId: string;
  private timeEngine: { getTime: () => number };

  constructor(scenarioId: string, timeEngine: { getTime: () => number }) {
    this.scenarioId = scenarioId;
    this.timeEngine = timeEngine;
  }

  /**
   * Pushes a new business event to the stream as an immutable record.
   */
  public emit(eventName: string, payload?: any, metadata?: { correlationId?: string, tenantId?: string, ownerId?: string }) {
    this.sequence++;
    const record: EventRecord = {
      sequenceNumber: this.sequence,
      virtualTime: this.timeEngine.getTime(),
      eventName,
      scenarioId: this.scenarioId,
      ...metadata,
      payload
    };
    
    // Immutable push (in real implementation, we'd freeze it)
    this.events.push(Object.freeze(record));
    console.log(`[EventStream] Emitted: #${this.sequence} [${record.virtualTime}ms] ${eventName}`);
  }

  /**
   * Asserts that the exact sequence of events occurred in the given order.
   */
  public expectEvents(expectedEvents: string[]) {
    const streamNames = this.events.map(e => e.eventName);
    const streamCopy = [...streamNames];
    
    for (const expected of expectedEvents) {
      const index = streamCopy.indexOf(expected);
      if (index === -1) {
        throw new Error(`EventStream Assertion Failed: Expected event '${expected}' was not found in the stream.\nActual stream: ${JSON.stringify(streamNames, null, 2)}`);
      }
      // Remove events up to the found index to ensure strict ordering
      streamCopy.splice(0, index + 1);
    }
  }
  
  public getStream(): ReadonlyArray<EventRecord> {
    return Object.freeze([...this.events]);
  }
}
