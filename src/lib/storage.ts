
'use server'

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Uploads a data URI to Cloudinary and returns the secure URL.
 * @param dataUri The data URI string (e.g., 'data:image/jpeg;base64,...').
 * @param path The folder in Cloudinary where the file should be saved.
 * @returns The public URL of the uploaded file.
 */
export async function uploadDataUriToStorage(dataUri: string, path: string): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: path,
      resource_type: "image",
    });
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error("Could not upload image.");
  }
}
