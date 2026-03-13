'use server';

import { v2 as cloudinary } from 'cloudinary';
import { getEnv } from './env';

// Configure Cloudinary
cloudinary.config({
  cloud_name: getEnv('CLOUDINARY_CLOUD_NAME'),
  api_key: getEnv('CLOUDINARY_API_KEY'),
  api_secret: getEnv('CLOUDINARY_API_SECRET'),
});

/**
 * Uploads a data URI to Cloudinary and returns the public URL.
 * @param dataUri The data URI string (e.g., 'data:image/jpeg;base64,...').
 * @param path The folder in Cloudinary where the file should be saved.
 * @returns The secure URL of the uploaded file.
 */
export async function uploadDataUriToStorage(dataUri: string, path: string): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: path,
      resource_type: "image",
    });

    if (!result.secure_url) {
      throw new Error("Failed to get secure URL from Cloudinary");
    }

    return result.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error("Could not upload image. " + (error instanceof Error ? error.message : ""));
  }
}
