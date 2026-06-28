import { Command } from "../../Command";
import { ExecutionContext } from "../../../core/engine/ExecutionContext";

export class CreatePropertyCommand implements Command {
  public readonly name = "CreatePropertyCommand";

  constructor(public readonly propertyName: string, public readonly rooms: number) {}

  async execute(ctx: ExecutionContext): Promise<void> {
    const ownerId = ctx.world.owner?.id;
    if (!ownerId) throw new Error("CreatePropertyCommand requires an Owner to exist in the WorldContext.");
    
    await ctx.provider.api.createProperty(ownerId, { name: this.propertyName, rooms: this.rooms });
  }
}
