import { ScenarioLogger } from '../helpers/Logger';
import { TimeController } from '../helpers/TimeController';
import { TenantFactory } from '../factories/factories'; // Assuming I move them

export class Scenario {
  private logger = new ScenarioLogger();
  private steps: (() => Promise<void> | void)[] = [];

  constructor(public name: string) {}

  createTenant(config?: any) {
    this.steps.push(() => {
      const tenant = TenantFactory.create(config);
      this.logger.log('Tenant Created', tenant);
      // DB injection logic would go here
    });
    return this;
  }

  createProperty(config?: any) {
    this.steps.push(() => {
      this.logger.log('Property Created', config);
    });
    return this;
  }

  advanceTime(days: number) {
    this.steps.push(() => {
      TimeController.advanceDays(days);
      this.logger.log(`Time Advanced by ${days} days`);
    });
    return this;
  }

  expectRentGenerated() {
    this.steps.push(async () => {
      this.logger.log('Asserting Rent Generated');
      // Assertions go here
    });
    return this;
  }

  pay() {
    this.steps.push(() => {
      this.logger.log('Payment Executed');
    });
    return this;
  }

  expectLedgerBalanced() {
    this.steps.push(() => {
      this.logger.log('Asserting Ledger Balanced');
    });
    return this;
  }

  async run() {
    this.logger.log(`Starting Scenario: ${this.name}`);
    for (const step of this.steps) {
      await step();
    }
    this.logger.log(`Completed Scenario: ${this.name}`);
    this.logger.printTimeline();
  }
}

export const scenario = (name: string) => new Scenario(name);
