import { v2 as cloudinary } from 'cloudinary';
import { Media } from '../models';
// storage strategy: Cloudinary when configured, MongoDB fallback otherwise.

// ─── Storage strategy ────────────────────────────────────────────────────────
// Uploaded files (inspection photos/videos, logos, documents) go to Cloudinary
// when it's configured, otherwise they fall back to the `Media` collection in
// MongoDB. The fallback keeps local dev working without Cloudinary keys.
//
// Configure via either:
//   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
// or the three separate vars below.
const hasCloudinary = !!(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET)
);

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}
// When CLOUDINARY_URL is present, the SDK auto-configures from it.

if (hasCloudinary) {
  console.log('☁️  Cloudinary storage enabled');
} else {
  console.log('🗄️  Cloudinary not configured — uploads fall back to MongoDB (Media)');
}

function uploadToCloudinary(file: Express.Multer.File): Promise<string> {
  const isVideo = file.mimetype.startsWith('video/');
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'slx/inspections',
        resource_type: isVideo ? 'video' : 'image',
        // Cloudinary keeps the original but can serve optimized derivatives via URL params.
      },
      (err, result) => {
        if (err || !result) {
          return reject(err || new Error('Falha no upload para o Cloudinary'));
        }
        resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });
}

async function saveToMongo(file: Express.Multer.File): Promise<string> {
  const media: any = await Media.create({
    filename: file.originalname,
    mimeType: file.mimetype,
    data: file.buffer,
    size: file.size,
  });
  return `/api/media/${media._id}`;
}

/**
 * Persist an uploaded file and return a fetchable URL.
 * Cloudinary when configured, MongoDB `Media` otherwise.
 */
export async function saveUploadedFile(file: Express.Multer.File): Promise<string> {
  if (hasCloudinary) return uploadToCloudinary(file);
  return saveToMongo(file);
}
