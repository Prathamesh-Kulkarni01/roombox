import { describe, it } from "vitest";
import { Certification } from "./Certification";
import { Scenario } from "../scenarios/dsl/ScenarioBuilder";
import { OwnerLoginJourney } from "../journeys/OwnerLoginJourney";
import { LocalEmulatorProvider } from "../core/engine/LocalEmulatorProvider";
import { EnterpriseProvider } from "../core/engine/EnterpriseProvider";
import { WorldBuilder } from "../world/WorldBuilder";

describe("RentSutra Certification: Authentication", () => {
  
  it("Phase C.1: Owner Login across Standard and Enterprise", async () => {
    
    // In a real execution, these providers wrap the real API.
    // For this demonstration, we use the emulator.
    const standardProvider = new LocalEmulatorProvider({} as any);
    
    // Mock enterprise provider for demonstration parity testing
    const enterpriseProvider = new LocalEmulatorProvider({} as any); 

    const StandardLogin = Scenario("Standard Tenant Owner Login")
      .on(standardProvider)
      .setup(WorldBuilder().seed("auth-standard-owner"))
      .compose(new OwnerLoginJourney("owner@standard.com"));

    const EnterpriseLogin = Scenario("Enterprise Tenant Owner Login")
      .on(enterpriseProvider)
      .setup(WorldBuilder().seed("auth-enterprise-owner"))
      .compose(new OwnerLoginJourney("owner@enterprise.com"));

    await Certification("Authentication Capability")
      .add(StandardLogin)
      .add(EnterpriseLogin)
      .run();
  });
});
