import { PlatformProvider } from "./PlatformProvider";
import { EventStream } from "../../validation/EventStream";

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

  public api = {
    createOwner: async (data: any) => {
      const id = `owner_${Date.now()}`;
      this.eventStream.emit("OwnerCreated", { id, ...data });
      return { id };
    },
    createProperty: async (ownerId: string, data: any) => {
      const id = `prop_${Date.now()}`;
      this.eventStream.emit("PropertyCreated", { id, ownerId, ...data });
      return { id };
    }
  };
}
