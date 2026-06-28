import { Command } from "../../Command";
import { ExecutionContext } from "../../../core/engine/ExecutionContext";

export class AcceptInviteCommand implements Command {
  public readonly name = "AcceptInviteCommand";

  constructor(public readonly guestEmail: string) {}

  async execute(ctx: ExecutionContext): Promise<void> {
    ctx.eventStream.emit("GuestAccepted", { email: this.guestEmail });
  }
}
