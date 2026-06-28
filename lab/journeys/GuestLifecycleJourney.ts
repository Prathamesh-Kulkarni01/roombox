import { BusinessJourney, ScenarioRunner } from "../scenarios/dsl/ScenarioBuilder";
import { InviteGuestCommand } from "../domain/TenantModule/Commands/InviteGuestCommand";
import { AcceptInviteCommand } from "../domain/TenantModule/Commands/AcceptInviteCommand";
import { GuestLoginCommand } from "../domain/TenantModule/Commands/GuestLoginCommand";

export class GuestLifecycleJourney implements BusinessJourney {
  constructor(private propertyId: string, private guestEmail: string) {}

  apply(scenario: ScenarioRunner): void {
    scenario
      .executeCommand(new InviteGuestCommand(this.propertyId, this.guestEmail))
      .executeCommand(new AcceptInviteCommand(this.guestEmail))
      .executeCommand(new GuestLoginCommand(this.guestEmail));
  }
}
