import { v2 as cloudinary } from 'cloudinary';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';

let cloudinaryInitialized = false;

/**
 * Check if Cloudinary credentials are provided in environment
 */
export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );
}

/**
 * Initialize Cloudinary configuration once
 */
export function initCloudinary() {
  if (cloudinaryInitialized) return true;

  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL.trim(),
      secure: true,
    });
    cloudinaryInitialized = true;
    return true;
  }

  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
      api_key: process.env.CLOUDINARY_API_KEY.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
      secure: true,
    });
    cloudinaryInitialized = true;
    return true;
  }

  return false;
}

// Attempt initial configuration
initCloudinary();

/**
 * Check if running in a serverless environment (e.g., Vercel, AWS Lambda)
 */
function isServerless() {
  return Boolean(
    process.env.VERCEL === '1' ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NEXT_RUNTIME === 'edge'
  );
}

/**
 * Upload a file buffer to the active storage backend.
 * @returns { url, publicId, width, height, format, bytes }
 */
export async function uploadToStorage(buffer, originalName, folder = 'uvape-media') {
  if (initCloudinary() || isCloudinaryConfigured()) {
    return await uploadToCloudinary(buffer, originalName, folder);
  }

  if (isServerless()) {
    throw new Error(
      "Cloud storage (Cloudinary) is required on Vercel because serverless environments have a read-only filesystem. " +
      "Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) in your Vercel Project Environment Variables."
    );
  }

  return await uploadToLocal(buffer, originalName);
}

/**
 * Delete a file from the active storage backend.
 */
export async function deleteFromStorage(publicId) {
  if (initCloudinary() || isCloudinaryConfigured()) {
    if (publicId) {
      return await deleteFromCloudinary(publicId);
    }
  }
  return await deleteFromLocal(publicId);
}

/**
 * Get optimized URL for display (Cloudinary transforms, or original for local)
 */
export function getOptimizedUrl(url, options = {}) {
  if (!url || !url.includes('cloudinary.com')) return url;
  const { width = 800, quality = 'auto', format = 'auto' } = options;
  return url.replace('/upload/', `/upload/w_${width},q_${quality},f_${format}/`);
}

export function getThumbnailUrl(url) {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', '/upload/w_300,h_300,c_fill,q_auto,f_auto/');
}

// ── Cloudinary Implementation ─────────────────────────────────
async function uploadToCloudinary(buffer, originalName, folder) {
  initCloudinary();
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Upload Stream Error]', error);
          return reject(new Error(error.message || 'Cloudinary upload failed'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );
    uploadStream.end(buffer);
  });
}

async function deleteFromCloudinary(publicId) {
  try {
    initCloudinary();
    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (err) {
    console.error('[Cloudinary Delete Error]', err);
    return { success: false, error: err.message };
  }
}

// ── Local Filesystem Fallback (for VPS) ────────────────────────
async function uploadToLocal(buffer, originalName) {
  const uploadDir = process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), 'public/uploads');
  await mkdir(uploadDir, { recursive: true });
  const safeName = `${Date.now()}-${originalName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '')}`;
  const filePath = path.join(uploadDir, safeName);
  await writeFile(filePath, buffer);
  return {
    url: `/uploads/${safeName}`,
    publicId: safeName,
    width: null,
    height: null,
    format: path.extname(safeName).replace('.', ''),
    bytes: buffer.length,
  };
}

async function deleteFromLocal(publicId) {
  try {
    const uploadDir = process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), 'public/uploads');
    const filePath = path.join(uploadDir, publicId);
    await unlink(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

