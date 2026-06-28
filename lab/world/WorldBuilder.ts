import { OwnerFactory } from "./factories/OwnerFactory";

export class WorldBuilderContext {
  public owner: OwnerFactory | null = null;
  private seedValue: string | null = null;

  public seed(seed: string) {
    this.seedValue = seed;
    // In real implementation, set the RNG seed here
    return this;
  }

  public createOwner(setup?: (owner: OwnerFactory) => void) {
    this.owner = new OwnerFactory();
    if (setup) {
      setup(this.owner);
    }
    return this;
  }

  public build() {
    console.log(`[WorldBuilder] World built with seed: ${this.seedValue}`);
    return this;
  }
}

export function WorldBuilder() {
  return new WorldBuilderContext();
}
