import { describe, it } from "vitest";
import { Scenario } from "../dsl/ScenarioBuilder";
import { WorldBuilder } from "../../world/WorldBuilder";
import { LocalEmulatorProvider } from "../../core/engine/LocalEmulatorProvider";
import { InvariantEngine } from "../../validation/invariants/InvariantEngine";

describe("RentLab Core Lifecycles", () => {
  it("Phase 1 Milestone: Owner creates property", async () => {
    
    // RentLab execution
    await Scenario("Owner creates property")
      .on(new LocalEmulatorProvider())
      .withAPI()
      .setup(
        WorldBuilder()
          .seed("phase1-milestone")
          .createOwner((owner) => {
             // Basic configuration
             owner.withProperty({ name: "Phase 1 PG" });
          })
      )
      .execute(async (world, provider) => {
        // Business logic execution sequence
        // 1. Create the owner
        const ownerData = await provider.api.createOwner({ name: "John Doe" });
        
        // 2. Create the property
        await provider.api.createProperty(ownerData.id, { name: "Phase 1 PG", rooms: 10 });
      })
      .expectEvents([
        "OwnerCreated",
        "PropertyCreated"
      ])
      .run();
      
    // Assert global invariants automatically after scenario completes
    InvariantEngine.verifyAll();
  });
});
