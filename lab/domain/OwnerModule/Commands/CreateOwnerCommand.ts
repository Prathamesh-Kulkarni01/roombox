import { Command } from "../../Command";
import { ExecutionContext } from "../../../core/engine/ExecutionContext";

export class CreateOwnerCommand implements Command {
  public readonly name = "CreateOwnerCommand";

  constructor(public readonly ownerName: string) {}

  async execute(ctx: ExecutionContext): Promise<void> {
    const ownerData = await ctx.provider.api.createOwner({ name: this.ownerName });
    // In a real system, the provider handles event emission, but if we orchestrate it here:
    // ctx.eventStream.emit("OwnerCreated", { id: ownerData.id, name: this.ownerName });
    // For now we assume LocalEmulatorProvider API emits it.
    
    // Store in context world so subsequent commands can find it
    if (!ctx.world.owner) {
        ctx.world.createOwner();
    }
    ctx.world.owner!.id = ownerData.id;
  }
}
