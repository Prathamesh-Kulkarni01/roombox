/**
 * Base Schema Contract for Modular Entities
 * All collections must adhere to schema versioning and safe defaults.
 */
export interface BaseEntity {
  id: string;
  schemaVersion: number;
  createdAt?: any;
  updatedAt?: any;
}

export const CORE_SCHEMA_VERSION = 1;

