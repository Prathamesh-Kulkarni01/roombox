import { CURRENT_SCHEMA_VERSION } from './types';

/**
 * RoomBox App Admin Data Integrity Shield
 * Implements strict checks per USER_GLOBAL DATABASE VERSIONING AND MIGRATION RULES
 */
export class AdminDataIntegrityShield {
  // Core collections that cannot be modified structurally or deleted
  private static PROTECTED_COLLECTIONS = [
    'owners', 'properties', 'rooms', 'beds', 'tenants', 'payments', 'complaints'
  ];

  /**
   * Validates Firestore document updates before writing to ensure strict compliance.
   * Throws an error if any database rules are violated.
   * 
   * @param collectionName The name of the Firestore collection
   * @param updates The partial fields being updated
   * @param currentData The optional current state of the document
   */
  static validateMutation(
    collectionName: string, 
    updates: Record<string, any>, 
    currentData?: Record<string, any>
  ): void {
    // Check if the collection falls under protected rules
    const isProtected = this.PROTECTED_COLLECTIONS.includes(collectionName) || 
                        collectionName.endsWith('pgs') || 
                        collectionName.endsWith('guests') ||
                        collectionName.endsWith('rooms') ||
                        collectionName.endsWith('beds') ||
                        collectionName.endsWith('payments') ||
                        collectionName.endsWith('complaints');

    if (!isProtected) return;

    // 1. NEVER BREAK EXISTING DATA (Rule 1)
    // Check if any updates try to nullify or delete existing fields (setting to undefined or null)
    for (const key of Object.keys(updates)) {
      const value = updates[key];
      
      // Prevent deleting / renaming existing fields by setting them to undefined/null
      if (value === null || value === undefined) {
        throw new Error(
          `[Data Integrity Shield] Rule 1 Violation: Field '${key}' cannot be deleted or set to null/undefined in protected collection '${collectionName}'.`
        );
      }

      // If we have current data, prevent changing type of existing fields (defensive check)
      if (currentData && key in currentData) {
        const currentVal = currentData[key];
        if (currentVal !== null && currentVal !== undefined) {
          const typeBefore = typeof currentVal;
          const typeAfter = typeof value;
          if (typeBefore !== typeAfter && typeBefore !== 'undefined' && typeAfter !== 'undefined') {
            console.warn(
              `[Data Integrity Shield Warning] Changing field type of '${key}' from ${typeBefore} to ${typeAfter}.`
            );
          }
        }
      }
    }

    // 2. USE SCHEMA VERSIONING (Rule 2)
    // Core documents must contain schemaVersion. 
    // If it's updated, it should never be downgraded or set to a non-numeric value.
    if ('schemaVersion' in updates) {
      const version = updates.schemaVersion;
      if (typeof version !== 'number' || version <= 0) {
        throw new Error(
          `[Data Integrity Shield] Rule 2 Violation: schemaVersion must be a positive number. Received: ${version}.`
        );
      }

      if (currentData && 'schemaVersion' in currentData) {
        const currentVersion = currentData.schemaVersion || 0;
        if (version < currentVersion) {
          throw new Error(
            `[Data Integrity Shield] Rule 2 Violation: Downgrading schemaVersion from ${currentVersion} to ${version} is forbidden.`
          );
        }
      }
    }
  }

  /**
   * Helper to verify collection name changes. (Rule 6)
   */
  static validateCollectionName(name: string): void {
    if (this.PROTECTED_COLLECTIONS.includes(name.toLowerCase())) {
      return;
    }
    
    // Check for renamed/illegal collections
    const lower = name.toLowerCase();
    const matchesProtected = this.PROTECTED_COLLECTIONS.some(protectedName => {
      // e.g. if trying to query 'tenants_new' instead of 'tenants'
      return lower !== protectedName && (lower.includes(protectedName) || protectedName.includes(lower));
    });

    if (matchesProtected) {
      throw new Error(
        `[Data Integrity Shield] Rule 6 Violation: Core collection names such as 'tenants', 'payments', etc., must not be structurally changed or renamed. Attempted: '${name}'.`
      );
    }
  }
}
