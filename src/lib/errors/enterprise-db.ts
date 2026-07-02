export class EnterpriseDbUnavailableError extends Error {
  constructor(ownerId: string, cause?: unknown) {
    super(`Enterprise database unavailable for owner ${ownerId}`);
    this.name = 'EnterpriseDbUnavailableError';
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}
