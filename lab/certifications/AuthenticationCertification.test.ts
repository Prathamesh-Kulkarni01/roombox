import { describe, it } from "vitest";
import { Certification } from "./Certification";
import { Scenario } from "../scenarios/dsl/ScenarioBuilder";
import { GuestLifecycleJourney } from "../journeys/GuestLifecycleJourney";
import { OwnerRegistrationJourney } from "../journeys/OwnerRegistrationJourney";
import { LocalEmulatorProvider } from "../core/engine/LocalEmulatorProvider";
import { Templates, WorldBuilder } from "../world/WorldBuilder";

describe("RentSutra Certifications", () => {
  it("Phase B Milestone: Authentication Certification Profile", async () => {
    
    // We would eventually test against both Standard and Enterprise providers
    const standardProvider = new LocalEmulatorProvider({} as any);

    const GuestLoginScenario = Scenario("Guest Onboarding & Login")
      .on(standardProvider)
      .setup(Templates.smallPG().seed("cert-auth-guest"))
      .compose(new GuestLifecycleJourney("prop-1", "guest@example.com"))
      .expectGuestVerified("guest@example.com");

    const OwnerLoginScenario = Scenario("Owner Registration & Login")
      .on(standardProvider)
      .setup(WorldBuilder().seed("cert-auth-owner"))
      .compose(new OwnerRegistrationJourney("Auth Corp", "Auth PG", 10));

    // Run the entire product capability suite
    await Certification("Authentication")
      .add(GuestLoginScenario)
      .add(OwnerLoginScenario)
      .run();

  });
});
