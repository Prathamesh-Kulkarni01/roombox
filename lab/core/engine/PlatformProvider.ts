export interface PlatformProvider {
  /**
   * Initializes the provider and prepares the environment.
   */
  initialize(): Promise<void>;

  /**
   * Cleans up the environment after execution.
   */
  cleanup(): Promise<void>;

  auth(): any;
  firestore(): any;
  storage(): any;
  scheduler(): any;
  notification(): any;
  payment(): any;
  queue(): any;
  secrets(): any;
  
  /**
   * Direct API bindings for testing business scenarios without UI.
   */
  api: {
    createOwner(data: any): Promise<{ id: string }>;
    createProperty(ownerId: string, data: any): Promise<{ id: string }>;
  };
}
