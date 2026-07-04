import { PlatformProvider } from "./PlatformProvider";
import { EventStream } from "../../validation/EventStream";

export interface ProviderAPI {
  createOwner(data: any): Promise<{ id: string }>;
  createProperty(ownerId: string, data: any): Promise<{ id: string }>;
  inviteGuest(params: { propertyId: string; email: string }): Promise<{ inviteId: string }>;
  acceptInvite(params: { inviteId: string }): Promise<{ guestId: string }>;
  guestLogin(params: { guestId: string }): Promise<{ token: string }>;
  generateRent(params: { guestId: string; amount: number; month: string }): Promise<{ invoiceId: string }>;
  
  loginOwner(params: { email: string }): Promise<{ ownerId: string; token: string; tenantId: string }>;
  loginGuest(params: { email: string }): Promise<{ guestId: string; token: string; tenantId: string }>;
}

export class LocalEmulatorProvider implements PlatformProvider {
  private eventStream: EventStream;
  
  constructor(eventStream: EventStream) {
      this.eventStream = eventStream;
  }

  async initialize(): Promise<void> {
    console.log("[LocalEmulatorProvider] Initializing emulator connections...");
  }

  async cleanup(): Promise<void> {
    console.log("[LocalEmulatorProvider] Tearing down emulator state...");
  }
  
  auth() { return {}; }
  firestore() { return {}; }
  storage() { return {}; }
  scheduler() { return {}; }
  notification() { return {}; }
  payment() { return {}; }
  queue() { return {}; }
  secrets() { return {}; }

  public api: ProviderAPI = {
    createOwner: async (p) => {
      const id = "owner-123";
      this.eventStream.emit("OwnerCreated", { id, name: p.name });
      return { id };
    },
    createProperty: async (ownerId, data) => {
      const id = "prop-456";
      this.eventStream.emit("PropertyCreated", { id, ownerId, name: data.name, rooms: data.rooms });
      return { id };
    },
    inviteGuest: async (p) => {
      const inviteId = "inv-789";
      this.eventStream.emit("GuestInvited", { inviteId, propertyId: p.propertyId, email: p.email });
      return { inviteId };
    },
    acceptInvite: async (p) => {
      const guestId = "guest-001";
      this.eventStream.emit("GuestAccepted", { guestId, inviteId: p.inviteId });
      return { guestId };
    },
    guestLogin: async (p) => {
      const token = "jwt-123";
      this.eventStream.emit("GuestLogin", { guestId: p.guestId });
      return { token };
    },
    generateRent: async (p) => {
      return { invoiceId: "inv-2024-01" };
    },
    
    loginOwner: async (p) => ({ ownerId: "owner-123", token: "jwt-owner", tenantId: "tenant-owner" }),
    loginGuest: async (p) => ({ guestId: "guest-001", token: "jwt-guest", tenantId: "tenant-guest" })
  };
}
