
'use server'

import { getStorage, getDownloadURL } from 'firebase-admin/storage';
import { adminDb } from './firebaseAdmin';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a data URI to Firebase Storage and returns the public URL.
 * @param dataUri The data URI string (e.g., 'data:image/jpeg;base64,...').
 * @param path The path in Firebase Storage where the file should be saved.
 * @returns The public URL of the uploaded file.
 */
export async function uploadDataUriToStorage(dataUri: string, path: string): Promise<string> {
  const storage = getStorage();
  const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

  // Extract content type and base64 data from data URI
  const matches = dataUri.match(/^data:(.+);base64,(.*)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid data URI string');
  }
  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // Generate a unique filename
  const filename = `${path}/${uuidv4()}`;
  const file = bucket.file(filename);

  await file.save(buffer, {
    metadata: {
      contentType: contentType,
    },
  });

  // Make the file public and get the URL
  await file.makePublic();
  
  // Return the public URL
  return file.publicUrl();
}

