export class StateMachine<T extends string> {
  private currentState: T;
  private validTransitions: Map<T, T[]>;

  constructor(initialState: T, transitions: Map<T, T[]>) {
    this.currentState = initialState;
    this.validTransitions = transitions;
  }

  public transition(newState: T) {
    const allowed = this.validTransitions.get(this.currentState) || [];
    if (!allowed.includes(newState)) {
      throw new Error(`Invalid state transition: Cannot go from ${this.currentState} to ${newState}`);
    }
    this.currentState = newState;
  }

  public getState(): T {
    return this.currentState;
  }
}
