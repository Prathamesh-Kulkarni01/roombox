import { describe, it } from "vitest";
import { Certification } from "./Certification";
import { Scenario } from "../scenarios/dsl/ScenarioBuilder";
import { GuestLifecycleJourney } from "../journeys/GuestLifecycleJourney";
import { LocalEmulatorProvider } from "../core/engine/LocalEmulatorProvider";
import { WorldBuilder } from "../world/WorldBuilder";

describe("RentSutra Certification: Guest Lifecycle", () => {
  
  it("Phase C.2: Guest Onboarding across Standard and Enterprise", async () => {
    
    const standardProvider = new LocalEmulatorProvider({} as any);
    const enterpriseProvider = new LocalEmulatorProvider({} as any);

    const StandardGuest = Scenario("Standard Tenant Guest Onboarding")
      .on(standardProvider)
      .setup(WorldBuilder().seed("guest-standard"))
      .compose(new GuestLifecycleJourney("prop-std-1", "guest@standard.com"))
      .expectGuestVerified("guest@standard.com");

    const EnterpriseGuest = Scenario("Enterprise Tenant Guest Onboarding")
      .on(enterpriseProvider)
      .setup(WorldBuilder().seed("guest-enterprise"))
      .compose(new GuestLifecycleJourney("prop-ent-1", "guest@enterprise.com"))
      .expectGuestVerified("guest@enterprise.com");

    await Certification("Guest Lifecycle Capability")
      .add(StandardGuest)
      .add(EnterpriseGuest)
      .run();
  });
});
