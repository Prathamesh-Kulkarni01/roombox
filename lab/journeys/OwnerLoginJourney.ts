import { BusinessJourney, ScenarioRunner } from "../scenarios/dsl/ScenarioBuilder";
import { OwnerLoginCommand } from "../domain/AuthModule/Commands/OwnerLoginCommand";

export class OwnerLoginJourney implements BusinessJourney {
  constructor(private email: string) {}

  apply(scenario: ScenarioRunner): void {
    scenario.executeCommand(new OwnerLoginCommand(this.email));
  }
}
