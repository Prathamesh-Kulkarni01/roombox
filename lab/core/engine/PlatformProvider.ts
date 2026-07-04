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
    inviteGuest(params: { propertyId: string; email: string }): Promise<{ inviteId: string }>;
    acceptInvite(params: { inviteId: string }): Promise<{ guestId: string }>;
    guestLogin(params: { guestId: string }): Promise<{ token: string }>;
    generateRent(params: { guestId: string; amount: number; month: string }): Promise<{ invoiceId: string }>;
    loginOwner(params: { email: string }): Promise<{ ownerId: string; token: string; tenantId: string }>;
    loginGuest(params: { email: string }): Promise<{ guestId: string; token: string; tenantId: string }>;
  };
}
