export interface ModuleManifest {
  id: string;
  name: string;
  description: string;
  routePrefix: string;
  icon?: string;
  version: string;
  schemaVersion: number;
  collections: string[];
  enabled: boolean;
  requiredRoles?: string[];
}

export interface ModuleRegistryContract {
  register(manifest: ModuleManifest): void;
  getModule(id: string): ModuleManifest | undefined;
  listModules(): ModuleManifest[];
}

class ModuleRegistry implements ModuleRegistryContract {
  private modules = new Map<string, ModuleManifest>();

  register(manifest: ModuleManifest): void {
    this.modules.set(manifest.id, manifest);
  }

  getModule(id: string): ModuleManifest | undefined {
    return this.modules.get(id);
  }

  listModules(): ModuleManifest[] {
    return Array.from(this.modules.values());
  }
}

export const moduleRegistry = new ModuleRegistry();

