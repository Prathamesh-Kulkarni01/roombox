export class EventStream {
  private events: string[] = [];

  /**
   * Pushes a new business event to the stream.
   */
  public emit(eventName: string, payload?: any) {
    this.events.push(eventName);
    // In a real implementation, we would also log the payload and timestamp.
    console.log(`[EventStream] Emitted: ${eventName}`);
  }

  /**
   * Asserts that the exact sequence of events occurred in the given order.
   * If the events occurred out of order or didn't occur, it throws an error.
   */
  public expectEvents(expectedEvents: string[]) {
    const stream = [...this.events];
    for (const expected of expectedEvents) {
      const index = stream.indexOf(expected);
      if (index === -1) {
        throw new Error(`EventStream Assertion Failed: Expected event '${expected}' was not found in the stream.\nActual stream: ${JSON.stringify(this.events, null, 2)}`);
      }
      // Remove events up to the found index to ensure strict ordering
      stream.splice(0, index + 1);
    }
  }

  /**
   * Clears the event stream.
   */
  public clear() {
    this.events = [];
  }
  
  public getStream() {
    return this.events;
  }
}

// Global instance for the scenario execution
export const globalEventStream = new EventStream();
