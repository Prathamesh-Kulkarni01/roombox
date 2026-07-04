import { Command } from "../../Command";
import { ExecutionContext } from "../../../core/engine/ExecutionContext";

export class OwnerLoginCommand implements Command {
  public readonly name = "OwnerLoginCommand";

  constructor(public readonly email: string) {}

  async execute(ctx: ExecutionContext): Promise<void> {
    const authData = await ctx.provider.api.loginOwner({ email: this.email });
    
    // In a real system, the API emits the event. For local emulator, we orchestrate it here.
    ctx.eventStream.emit("OwnerLoginSuccess", { 
        email: this.email, 
        token: authData.token,
        tenantId: authData.tenantId
    });

    if (ctx.world.owner) {
        ctx.world.owner.id = authData.ownerId;
    }
  }
}
