import { Command } from "../../Command";
import { ExecutionContext } from "../../../core/engine/ExecutionContext";

export class InviteGuestCommand implements Command {
  public readonly name = "InviteGuestCommand";

  constructor(public readonly propertyId: string, public readonly guestEmail: string) {}

  async execute(ctx: ExecutionContext): Promise<void> {
    // Mock API call to invite guest
    ctx.eventStream.emit("GuestInvited", { propertyId: this.propertyId, email: this.guestEmail });
  }
}
