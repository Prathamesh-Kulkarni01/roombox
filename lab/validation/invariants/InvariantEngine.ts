import { ExecutionContext } from "../../core/engine/ExecutionContext";

export class InvariantEngine {
  private globalInvariants: Array<(ctx: ExecutionContext) => void> = [];
  private scenarioInvariants: Array<(ctx: ExecutionContext) => void> = [];
  private providerInvariants: Array<(ctx: ExecutionContext) => void> = [];

  constructor() {
    // Default Global Invariants
    this.addGlobalInvariant((ctx) => {
      const events = ctx.eventStream.getStream().map(e => e.eventName);
      const propCreated = events.includes("PropertyCreated");
      const ownerCreated = events.includes("OwnerCreated");
      if (propCreated && !ownerCreated) {
        throw new Error("Global Invariant Violation: PropertyCreated without OwnerCreated.");
      }
    });
  }

  public addGlobalInvariant(fn: (ctx: ExecutionContext) => void) {
    this.globalInvariants.push(fn);
  }

  public addScenarioInvariant(fn: (ctx: ExecutionContext) => void) {
    this.scenarioInvariants.push(fn);
  }

  public addProviderInvariant(fn: (ctx: ExecutionContext) => void) {
    this.providerInvariants.push(fn);
  }

  public verifyAll(ctx: ExecutionContext) {
    console.log("[InvariantEngine] Verifying all invariant levels...");
    
    for (const inv of this.globalInvariants) inv(ctx);
    for (const inv of this.scenarioInvariants) inv(ctx);
    for (const inv of this.providerInvariants) inv(ctx);
    
    console.log("[InvariantEngine] ✔️ All invariants passed.");
  }
}
