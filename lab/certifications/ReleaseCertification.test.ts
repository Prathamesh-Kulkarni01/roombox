import { describe, it } from "vitest";
import { Certification } from "./Certification";
import { Scenario } from "../scenarios/dsl/ScenarioBuilder";
import { GuestLifecycleJourney } from "../journeys/GuestLifecycleJourney";
import { OwnerRegistrationJourney } from "../journeys/OwnerRegistrationJourney";
import { LocalEmulatorProvider } from "../core/engine/LocalEmulatorProvider";
import { WorldBuilder } from "../world/WorldBuilder";

describe("RentSutra Release Gates", () => {
  it("Phase C Milestone: Full Release Certification Profile", async () => {
    
    const standardProvider = new LocalEmulatorProvider({} as any);

    // Build the core scenarios from composable journeys
    const OwnerJourney = Scenario("Owner Property Setup")
      .on(standardProvider)
      .setup(WorldBuilder().seed("release-owner"))
      .compose(new OwnerRegistrationJourney("Golden Corp", "Golden PG", 100));

    const GuestJourney = Scenario("Guest Onboarding Flow")
      .on(standardProvider)
      .setup(WorldBuilder().seed("release-guest"))
      .compose(new GuestLifecycleJourney("golden-prop", "alice@example.com"))
      .expectGuestVerified("alice@example.com");

    // The Release Certification aggregates all critical packs
    await Certification("RentSutra Core Release Gate")
      .add(OwnerJourney)
      .add(GuestJourney)
      // .add(BillingJourney)
      // .add(EnterpriseParityJourney)
      .run();
  });
});
