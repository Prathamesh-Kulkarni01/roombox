import { PlatformProvider } from "./PlatformProvider";
import { globalEventStream } from "../../validation/EventStream";

export class LocalEmulatorProvider implements PlatformProvider {
  async initialize(): Promise<void> {
    console.log("[LocalEmulatorProvider] Initializing emulator connections...");
    // Mock connections to localhost:8081 etc.
  }

  async teardown(): Promise<void> {
    console.log("[LocalEmulatorProvider] Tearing down emulator state...");
  }

  public api = {
    createOwner: async (data: any) => {
      // Mock API call
      const id = `owner_${Date.now()}`;
      globalEventStream.emit("OwnerCreated", { id, ...data });
      return { id };
    },
    createProperty: async (ownerId: string, data: any) => {
      // Mock API call
      const id = `prop_${Date.now()}`;
      globalEventStream.emit("PropertyCreated", { id, ownerId, ...data });
      return { id };
    }
  };
}
