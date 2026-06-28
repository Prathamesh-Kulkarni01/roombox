import { describe, it } from "vitest";
import { Scenario } from "../dsl/ScenarioBuilder";
import { Templates } from "../../world/WorldBuilder";
import { LocalEmulatorProvider } from "../../core/engine/LocalEmulatorProvider";

describe("RentLab Core Lifecycles", () => {
  it("Phase 1.1 Milestone: Owner creates property with Execution Context", async () => {
    
    // We pass a dummy eventStream here for the provider constructor,
    // but the scenario will inject the real one in run().
    const provider = new LocalEmulatorProvider({} as any);

    // RentLab execution
    await Scenario("Owner creates property")
      .requirements(["REQ-001"])
      .tags(["foundation", "critical"])
      .on(provider)
      .withAPI()
      .setup(Templates.smallPG().seed("phase1.1-milestone"))
      .execute(async (ctx) => {
        // Business logic execution sequence using Context
        
        // 1. Create the owner
        const ownerData = await ctx.provider.api.createOwner({ name: "John Doe" });
        
        // 2. Create the property
        await ctx.provider.api.createProperty(ownerData.id, { name: "Small PG", rooms: 5 });
        
        // 3. Advance virtual time just to prove it exists on the context
        await ctx.virtualTime.advance("1d");
      })
      .expectEvents([
        "OwnerCreated",
        "PropertyCreated"
      ])
      .run();
  });
});
