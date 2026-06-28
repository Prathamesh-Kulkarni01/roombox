export interface PlatformProvider {
  /**
   * Initializes the provider and prepares the environment.
   */
  initialize(): Promise<void>;

  /**
   * Cleans up the environment after execution.
   */
  teardown(): Promise<void>;

  // Future capabilities will go here:
  // auth(): AuthProvider;
  // firestore(): FirestoreProvider;
  // scheduler(): SchedulerProvider;
  
  /**
   * Direct API bindings for testing business scenarios without UI.
   */
  api: {
    createOwner(data: any): Promise<{ id: string }>;
    createProperty(ownerId: string, data: any): Promise<{ id: string }>;
  };
}
