import { Command } from "../../Command";
import { ExecutionContext } from "../../../core/engine/ExecutionContext";

export class GuestLoginCommand implements Command {
  public readonly name = "GuestLoginCommand";

  constructor(public readonly email: string) {}

  async execute(ctx: ExecutionContext): Promise<void> {
    const authData = await ctx.provider.api.loginGuest({ email: this.email });
    
    ctx.eventStream.emit("GuestLoginSuccess", { 
        email: this.email, 
        token: authData.token,
        tenantId: authData.tenantId
    });
  }
}
