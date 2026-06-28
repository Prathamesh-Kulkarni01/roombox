import { Command } from "../../Command";
import { ExecutionContext } from "../../../core/engine/ExecutionContext";

export class GuestLoginCommand implements Command {
  public readonly name = "GuestLoginCommand";

  constructor(public readonly guestEmail: string) {}

  async execute(ctx: ExecutionContext): Promise<void> {
    ctx.eventStream.emit("GuestLogin", { email: this.guestEmail });
  }
}
