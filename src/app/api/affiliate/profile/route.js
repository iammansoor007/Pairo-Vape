import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Affiliate from "@/models/Affiliate";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { uploadToStorage, isCloudinaryConfigured } from "@/lib/storage";

// Validates and saves a single uploaded file, returns the saved filename or URL
async function validateAndSaveFile(file, allowedMimes, maxSize, privateDir) {
  if (!allowedMimes.includes(file.type)) {
    throw new Error(`File type "${file.type}" not allowed. Accepted: ${allowedMimes.join(", ")}`);
  }
  if (file.size > maxSize) {
    throw new Error(`File "${file.name}" exceeds the ${Math.round(maxSize / 1024 / 1024)}MB size limit.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const magicHex = buffer.slice(0, 4).toString('hex').toUpperCase();
  let isValidMagic = false;

  if (magicHex.startsWith('89504E47')) isValidMagic = true; // PNG
  else if (magicHex.startsWith('FFD8FF')) isValidMagic = true;  // JPEG/JPG
  else if (magicHex.startsWith('25504446')) isValidMagic = true; // PDF
  else if (magicHex.startsWith('52494646') || magicHex.startsWith('57454250')) isValidMagic = true; // WebP (RIFF/WEBP)

  if (!isValidMagic) {
    throw new Error(`Security rejection: "${file.name}" failed magic-bytes validation.`);
  }

  // If Cloudinary is configured (e.g. on Vercel or cloud deployment)
  if (isCloudinaryConfigured()) {
    const stored = await uploadToStorage(buffer, file.name, "pairo-kyc");
    return stored.url;
  }

  if (process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error("File uploads require Cloudinary to be configured on Vercel.");
  }

  if (!fs.existsSync(privateDir)) {
    fs.mkdirSync(privateDir, { recursive: true });
  }

  const uniqueFilename = `${crypto.randomUUID()}-${path.basename(file.name)}`;
  const filePath = path.resolve(privateDir, uniqueFilename);
  await fs.promises.writeFile(filePath, buffer);
  return uniqueFilename;
}

export async function PUT(req) {
  await dbConnect();
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAffiliate) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const affiliateCheck = await Affiliate.findById(session.user.id).select("status").lean();
    if (!affiliateCheck || affiliateCheck.status !== 'Active') {
      return NextResponse.json({ error: "Unauthorized: Account suspended or inactive" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";
    let body = {};
    let profilePhotoFile = null;
    let bankVerificationDocFile = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          if (key === "profilePhoto") {
            profilePhotoFile = value;
          } else if (key === "bankVerificationDocument") {
            bankVerificationDocFile = value;
          }
        } else {
          body[key] = value;
        }
      }
    } else {
      body = await req.json().catch(() => ({}));
    }
    
    // Build partial update — only include fields that are explicitly provided
    const setFields = {};

    if (body.name !== undefined) setFields.name = body.name;
    if (body.phone !== undefined) setFields.phone = body.phone;
    if (body.dob !== undefined) setFields.dob = body.dob;

    // Handle files if uploaded
    if ((profilePhotoFile && profilePhotoFile.size > 0) || (bankVerificationDocFile && bankVerificationDocFile.size > 0)) {
      const privateDir = path.resolve(process.cwd(), "private", "kyc");
      if (!isCloudinaryConfigured() && !fs.existsSync(privateDir)) {
        try {
          fs.mkdirSync(privateDir, { recursive: true });
        } catch (err) {
          console.warn("[Affiliate Profile] Could not create local kyc dir:", err.message);
        }
      }

      const PHOTO_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      const KYC_ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf'];
      const MAX_DOC_SIZE = 5 * 1024 * 1024;
      const MAX_PHOTO_SIZE = 3 * 1024 * 1024;

      if (profilePhotoFile && profilePhotoFile.size > 0) {
        try {
          const profilePhotoFilename = await validateAndSaveFile(profilePhotoFile, PHOTO_ALLOWED_MIME, MAX_PHOTO_SIZE, privateDir);
          setFields.profilePhoto = profilePhotoFilename;
        } catch (err) {
          return NextResponse.json({ error: `Profile Photo upload error: ${err.message}` }, { status: 400 });
        }
      }

      if (bankVerificationDocFile && bankVerificationDocFile.size > 0) {
        try {
          const bankDocFilename = await validateAndSaveFile(bankVerificationDocFile, KYC_ALLOWED_MIME, MAX_DOC_SIZE, privateDir);
          setFields.bankVerificationDocument = bankDocFilename;
        } catch (err) {
          return NextResponse.json({ error: `Bank Verification upload error: ${err.message}` }, { status: 400 });
        }
      }
    } else if (body.profilePhoto !== undefined) {
      // Fallback for direct photo filename/URL strings
      setFields.profilePhoto = body.profilePhoto;
    }
    
    if (body.companyName !== undefined || body.website !== undefined || body.socialLinks !== undefined) {
      const existing = await Affiliate.findById(session.user.id).select("businessInfo").lean();
      setFields.businessInfo = {
        companyName: body.companyName !== undefined ? body.companyName : (existing?.businessInfo?.companyName || ""),
        website: body.website !== undefined ? body.website : (existing?.businessInfo?.website || ""),
        socialLinks: body.socialLinks !== undefined
          ? body.socialLinks.split(",").map(link => link.trim()).filter(Boolean)
          : (existing?.businessInfo?.socialLinks || [])
      };
    }
    
    if (body.street !== undefined || body.city !== undefined || body.state !== undefined || body.zipCode !== undefined || body.country !== undefined) {
      // Fetch existing address to merge
      const existing = await Affiliate.findById(session.user.id).select("address").lean();
      setFields.address = {
        street: body.street !== undefined ? body.street : (existing?.address?.street || ""),
        city: body.city !== undefined ? body.city : (existing?.address?.city || ""),
        state: body.state !== undefined ? body.state : (existing?.address?.state || ""),
        zipCode: body.zipCode !== undefined ? body.zipCode : (existing?.address?.zipCode || ""),
        country: body.country !== undefined ? body.country : (existing?.address?.country || "")
      };
    }

    if (body.accountHolder !== undefined || body.bankName !== undefined || body.accountNumber !== undefined || 
        body.iban !== undefined || body.swiftCode !== undefined || body.routingNumber !== undefined || body.paypalEmail !== undefined) {
      const existing = await Affiliate.findById(session.user.id).select("bankingInfo").lean();
      setFields.bankingInfo = {
        accountHolder: body.accountHolder !== undefined ? body.accountHolder : (existing?.bankingInfo?.accountHolder || ""),
        bankName: body.bankName !== undefined ? body.bankName : (existing?.bankingInfo?.bankName || ""),
        accountNumber: body.accountNumber !== undefined ? body.accountNumber : (existing?.bankingInfo?.accountNumber || ""),
        iban: body.iban !== undefined ? body.iban : (existing?.bankingInfo?.iban || ""),
        swiftCode: body.swiftCode !== undefined ? body.swiftCode : (existing?.bankingInfo?.swiftCode || ""),
        routingNumber: body.routingNumber !== undefined ? body.routingNumber : (existing?.bankingInfo?.routingNumber || ""),
        paypalEmail: body.paypalEmail !== undefined ? body.paypalEmail : (existing?.bankingInfo?.paypalEmail || "")
      };
    }

    if (Object.keys(setFields).length === 0) {
      return NextResponse.json({ error: "No fields provided to update." }, { status: 400 });
    }

    const updatedAffiliate = await Affiliate.findByIdAndUpdate(
      session.user.id,
      { $set: setFields },
      { new: true }
    );

    if (!updatedAffiliate) {
      return NextResponse.json({ error: "Affiliate not found." }, { status: 404 });
    }

    console.log(`[AffiliateAPI] Profile updated for affiliate: ${updatedAffiliate.referralCode}`);

    return NextResponse.json({ success: true, profile: updatedAffiliate });

  } catch (error) {
    console.error("[AffiliateProfile PUT Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
