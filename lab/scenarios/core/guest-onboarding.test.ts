import { describe, it, expect } from "vitest";
import { Scenario } from "../dsl/ScenarioBuilder";
import { Templates } from "../../world/WorldBuilder";
import { LocalEmulatorProvider } from "../../core/engine/LocalEmulatorProvider";
import { CreateOwnerCommand } from "../../domain/OwnerModule/Commands/CreateOwnerCommand";
import { CreatePropertyCommand } from "../../domain/PropertyModule/Commands/CreatePropertyCommand";
import { InviteGuestCommand } from "../../domain/TenantModule/Commands/InviteGuestCommand";
import { AcceptInviteCommand } from "../../domain/TenantModule/Commands/AcceptInviteCommand";
import { GuestLoginCommand } from "../../domain/TenantModule/Commands/GuestLoginCommand";
import { TenantProjection } from "../../domain/TenantModule/Projections/TenantProjection";

describe("RentLab Domain Engine", () => {
  it("Phase 1.2 Milestone: Guest Onboarding", async () => {
    const provider = new LocalEmulatorProvider({} as any);

    // RentLab execution
    const ctx = await Scenario("Guest Onboarding Flow")
      .requirements(["REQ-002", "REQ-003"])
      .tags(["tenant", "onboarding"])
      .requires({ auth: true, scheduler: false })
      .on(provider)
      .withAPI()
      .setup(Templates.smallPG().seed("phase1.2-milestone"))
      
      // Execute the domain commands explicitly
      .executeCommand(new CreateOwnerCommand("Enterprise Corp"))
      .executeCommand(new CreatePropertyCommand("Campus A", 50))
      .executeCommand(new InviteGuestCommand("prop-1", "alice@example.com"))
      .executeCommand(new AcceptInviteCommand("alice@example.com"))
      .executeCommand(new GuestLoginCommand("alice@example.com"))
      
      .expectEvents([
        "OwnerCreated",
        "PropertyCreated",
        "GuestInvited",
        "GuestAccepted",
        "GuestLogin"
      ])
      .run();
      
    // Assert against the projection, completely decoupled from the database
    const tenantModel = new TenantProjection(ctx.eventStream);
    const alice = tenantModel.getGuest("alice@example.com");
    
    expect(alice).toBeDefined();
    expect(alice.status).toBe("Verified");
  });
});
