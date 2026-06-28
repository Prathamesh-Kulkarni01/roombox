import { Scenario } from "../scenarios/dsl/ScenarioBuilder";
import { OwnerRegistrationJourney } from "../journeys/OwnerRegistrationJourney";
import { GuestLifecycleJourney } from "../journeys/GuestLifecycleJourney";
import { Templates } from "../world/WorldBuilder";
import { LocalEmulatorProvider } from "../core/engine/LocalEmulatorProvider";

// This represents the ultimate Release Gate scenario.
// It will eventually test Owner -> Subscription -> 100 Rooms -> 200 Guests -> 
// 30 Days -> Rent -> Reminders -> Partial Payments -> Checkout -> Refund -> Migration.

export const GoldenScenario = Scenario("The Golden Release Gate")
  .requirements(["CORE-100", "BILLING-200", "TENANT-300"])
  .tags(["golden", "release-gate", "e2e"])
  .requires({ auth: true, scheduler: true, payments: true })
  .on(new LocalEmulatorProvider({} as any)) // Defaults to emulator, CI overrides this
  .setup(Templates.demo().seed("golden-seed-1"))
  .compose(new OwnerRegistrationJourney("Golden Corp", "Golden PG", 100))
  .compose(new GuestLifecycleJourney("golden-prop-1", "golden-guest@example.com"))
  // .compose(new MonthlyRentLifecycleJourney())
  // .compose(new PaymentAndLedgerJourney())
  // .compose(new CheckoutAndRefundJourney())
  // .compose(new EnterpriseMigrationJourney())
  
  .expectGuestVerified("golden-guest@example.com")
  // .expectLedgerBalanced()
  // .expectOccupancy(100)
  ;
