import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Recursively removes properties with `undefined` values from an object.
 * This is crucial for preparing data to be sent to Firestore, which does not support `undefined`.
 * @param obj The object to clean.
 * @returns A new object with all `undefined` properties removed.
 */
export function sanitizeObjectForFirebase(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectForFirebase(item));
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        newObj[key] = sanitizeObjectForFirebase(value);
      }
    }
  }
  return newObj;
}
