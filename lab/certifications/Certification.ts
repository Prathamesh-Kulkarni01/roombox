import { ScenarioRunner } from "../scenarios/dsl/ScenarioBuilder";

export class CertificationRunner {
  private scenarios: ScenarioRunner[] = [];

  constructor(public readonly title: string) {}

  public add(scenario: ScenarioRunner) {
    this.scenarios.push(scenario);
    return this;
  }

  public async run() {
    console.log(`\n======================================================`);
    console.log(`🏆 [Certification Suite] Starting: ${this.title}`);
    console.log(`======================================================\n`);
    
    let passCount = 0;
    
    for (const scenario of this.scenarios) {
      try {
        await scenario.run();
        passCount++;
      } catch (err: any) {
        console.error(`\n[Certification] ❌ Scenario Failed: ${err.message}\n`);
        throw err;
      }
    }
    
    console.log(`\n======================================================`);
    console.log(`✅ [Certification] Passed: ${this.title} (${passCount}/${this.scenarios.length} Scenarios)`);
    console.log(`======================================================\n`);
  }
}

export function Certification(title: string) {
  return new CertificationRunner(title);
}
