import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Media from "@/models/Media";
import { NextResponse } from "next/server";
import { uploadToStorage } from "@/lib/storage";
import { can } from "@/lib/rbac";

// Allowed MIME types
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif',
  'image/webp', 'image/svg+xml', 'image/avif',
];
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

// SECURITY: Using centralized RBAC check to ensure only authorized staff 
// with 'media.manage' permissions can upload assets.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.isStaff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  if (!can(session.user, "media.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await dbConnect();
    const formData = await req.formData();
    const files = formData.getAll("file");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      // ── Validation ─────────────────────────────────
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push({ file: file.name, error: `File type "${file.type}" is not allowed.` });
        continue;
      }

      if (file.size > MAX_SIZE_BYTES) {
        errors.push({ file: file.name, error: `File exceeds 8MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB).` });
        continue;
      }

      try {
        // ── Read Buffer ─────────────────────────────────
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // ── Upload to Storage (Cloudinary or Local) ─────
        const stored = await uploadToStorage(buffer, file.name, 'uvape-media');

        // ── Sanitize filename ────────────────────────────
        const sanitizedName = file.name
          .replace(/\s+/g, '-')
          .replace(/[^a-zA-Z0-9._-]/g, '')
          .toLowerCase();

        // ── Determine mediaType ──────────────────────────
        const mediaType = file.type.startsWith('video/') ? 'video'
          : file.type.startsWith('image/') ? 'image' : 'document';

        // ── Determine thumbnailUrl ───────────────────────
        const thumbnailUrl = stored.url.includes('cloudinary.com')
          ? stored.url.replace('/upload/', '/upload/w_300,h_300,c_fill,q_auto,f_auto/')
          : stored.url;

        // ── Save to MongoDB ──────────────────────────────
        const media = await Media.create({
          filename: sanitizedName,
          originalName: file.name,
          url: stored.url,
          publicId: stored.publicId,
          thumbnailUrl,
          title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          altText: '',
          mimeType: file.type,
          fileSize: stored.bytes || file.size,
          width: stored.width,
          height: stored.height,
          format: stored.format,
          mediaType,
          uploadedBy: session.user.id,
          uploadSource: formData.get('source') || 'admin-upload',
          folder: formData.get('folder') || 'general',
        });

        results.push(media);
      } catch (fileErr) {
        console.error(`[Media Upload Error: ${file.name}]`, fileErr);
        errors.push({ file: file.name, error: fileErr.message || 'Upload failed' });
      }
    }

    if (results.length === 0 && errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: errors[0]?.error || 'Failed to upload files',
        errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      uploaded: results,
      errors,
      count: results.length,
    }, { status: 201 });

  } catch (error) {
    console.error('[Media Upload Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

