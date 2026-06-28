import { BusinessJourney, ScenarioRunner } from "../scenarios/dsl/ScenarioBuilder";
import { CreateOwnerCommand } from "../domain/OwnerModule/Commands/CreateOwnerCommand";
import { CreatePropertyCommand } from "../domain/PropertyModule/Commands/CreatePropertyCommand";

export class OwnerRegistrationJourney implements BusinessJourney {
  constructor(private ownerName: string, private propertyName: string, private rooms: number) {}

  apply(scenario: ScenarioRunner): void {
    scenario
      .executeCommand(new CreateOwnerCommand(this.ownerName))
      .executeCommand(new CreatePropertyCommand(this.propertyName, this.rooms));
  }
}
