import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Product from "@/models/Product";
import Category from "@/models/Category";
import { can } from "@/lib/rbac";
import { NextResponse } from "next/server";
import { trackMediaUsage, findMediaByUrl } from "@/lib/mediaUsage";
import mongoose from "mongoose";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.isStaff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(session.user, "products.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids");
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit")) || 300, 1000);
    const tenantId = searchParams.get("tenantId") || "DEFAULT_STORE";

    const query = { isDeleted: { $ne: true } };

    if (tenantId) {
      query.tenantId = tenantId;
    }

    if (idsParam) {
      const idList = idsParam
        .split(",")
        .map((s) => s.trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (idList.length > 0) {
        query._id = { $in: idList };
      } else {
        query._id = { $in: [] };
      }
    }

    if (status && status !== "All") {
      query.status = status;
    }

    if (category && category !== "All") {
      query.$or = [
        { category: category },
        { primaryCategory: category },
        { categories: category }
      ];
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { slug: searchRegex }
      ];
    }

    const [products, categories] = await Promise.all([
      Product.find(query)
        .select(
          "name slug sku price compareAtPrice stock manageStock category categories primaryCategory status isFeatured tags image images shortDescription tenantId"
        )
        .populate("categories", "name slug")
        .populate("primaryCategory", "name slug")
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(limit)
        .lean(),
      Category.find({
        isDeleted: { $ne: true },
        $or: [{ type: "product" }, { type: { $exists: false } }],
      })
        .select("_id name slug")
        .sort({ name: 1 })
        .lean(),
    ]);

    const formattedProducts = products.map((p) => {
      const catName =
        p.category ||
        p.primaryCategory?.name ||
        (Array.isArray(p.categories) && p.categories[0]?.name) ||
        "";

      return {
        _id: p._id.toString(),
        name: p.name || "",
        sku: p.sku || "",
        price: p.price ?? 0,
        compareAtPrice: p.compareAtPrice ?? "",
        stock: p.stock ?? 0,
        manageStock: p.manageStock ?? true,
        category: catName,
        status: p.status || "Draft",
        isFeatured: Boolean(p.isFeatured),
        tags: Array.isArray(p.tags) ? p.tags.join(", ") : p.tags || "",
        image: p.image || (Array.isArray(p.images) && p.images[0]) || "",
        shortDescription: p.shortDescription || "",
        slug: p.slug || "",
      };
    });

    return NextResponse.json({
      products: formattedProducts,
      categories: categories.map((c) => ({ _id: c._id.toString(), name: c.name })),
    });
  } catch (error) {
    console.error("[Bulk GET Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.isStaff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  try {
    const body = await req.json();
    const { creates = [], updates = [], deletes = [], tenantId = "DEFAULT_STORE" } = body;

    // Check permissions
    if (creates.length > 0 && !can(session.user, "products.create")) {
      return NextResponse.json({ error: "Permission denied: products.create" }, { status: 403 });
    }
    if (updates.length > 0 && !can(session.user, "products.edit")) {
      return NextResponse.json({ error: "Permission denied: products.edit" }, { status: 403 });
    }
    if (deletes.length > 0 && !can(session.user, "products.delete")) {
      return NextResponse.json({ error: "Permission denied: products.delete" }, { status: 403 });
    }

    // Cache categories for rapid matching
    const allCategories = await Category.find({
      isDeleted: { $ne: true },
      $or: [{ type: "product" }, { type: { $exists: false } }],
    }).lean();
    const categoryMap = new Map();
    allCategories.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase().trim(), cat);
      categoryMap.set(cat._id.toString(), cat);
    });

    const resolveCategory = (catVal) => {
      if (catVal === undefined || catVal === null) return {};
      if (typeof catVal === "string" && !catVal.trim()) {
        return {
          category: "",
          primaryCategory: null,
          categories: [],
        };
      }
      const trimmed = String(catVal).trim();
      const match = categoryMap.get(trimmed.toLowerCase()) || categoryMap.get(trimmed);
      if (match) {
        return {
          category: match.name,
          primaryCategory: match._id,
          categories: [match._id],
        };
      }
      return { category: trimmed, primaryCategory: null, categories: [] };
    };

    const errors = [];
    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    // 1. Process Deletions (Soft-delete to Trash)
    if (deletes.length > 0) {
      const validDeletes = deletes.filter((d) => mongoose.Types.ObjectId.isValid(d));
      if (validDeletes.length > 0) {
        const delResult = await Product.updateMany(
          { _id: { $in: validDeletes }, tenantId },
          { $set: { isDeleted: true } }
        );
        deletedCount = delResult.modifiedCount || 0;
      }
    }

    // 2. Process Creates
    const usedSlugsInBatch = new Set();
    for (let i = 0; i < creates.length; i++) {
      const item = creates[i];
      try {
        if (!item.name || !String(item.name).trim()) {
          errors.push({ row: i + 1, field: "name", message: "Product name is required" });
          continue;
        }

        const priceNum = Number(item.price);
        if (isNaN(priceNum) || priceNum < 0) {
          errors.push({ row: i + 1, field: "price", message: "Price must be a valid positive number" });
          continue;
        }

        // Generate clean unique slug
        let baseSlug = (item.slug || item.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
        if (!baseSlug) baseSlug = "product";

        let finalSlug = baseSlug;
        let counter = 1;
        while (
          usedSlugsInBatch.has(finalSlug) ||
          (await Product.findOne({ slug: finalSlug, tenantId }))
        ) {
          finalSlug = `${baseSlug}-${counter}`;
          counter++;
        }
        usedSlugsInBatch.add(finalSlug);

        // Resolve categories
        const catData = resolveCategory(item.category);

        // Parse tags
        let parsedTags = [];
        if (Array.isArray(item.tags)) {
          parsedTags = item.tags;
        } else if (typeof item.tags === "string" && item.tags.trim()) {
          parsedTags = item.tags.split(",").map((t) => t.trim()).filter(Boolean);
        }

        // Parse image / images
        const imageStr = (item.image || "").trim();
        const imagesArr = imageStr ? [imageStr] : [];

        const stockNum =
          item.stock !== "" && !isNaN(Number(item.stock)) ? Math.max(0, parseInt(item.stock, 10)) : 0;
        const isManagingStock = item.manageStock !== false;
        const availabilityStatus = !isManagingStock || stockNum > 0 ? "In Stock" : "Out of Stock";

        const productPayload = {
          name: item.name.trim(),
          slug: finalSlug,
          sku: item.sku ? String(item.sku).trim() : "",
          price: priceNum,
          compareAtPrice: item.compareAtPrice !== "" && item.compareAtPrice !== null && !isNaN(Number(item.compareAtPrice))
            ? (Number(item.compareAtPrice) > 0 ? Number(item.compareAtPrice) : undefined)
            : undefined,
          stock: stockNum,
          availabilityStatus,
          manageStock: isManagingStock,
          status: item.status === "Published" ? "Published" : "Draft",
          isFeatured: Boolean(item.isFeatured),
          tags: parsedTags,
          image: imageStr,
          images: imagesArr,
          shortDescription: item.shortDescription || "",
          tenantId,
          ...catData,
        };

        const createdDoc = await Product.create(productPayload);
        createdCount++;

        // Track media usage if image provided
        if (imageStr) {
          try {
            const media = await findMediaByUrl(imageStr);
            if (media) {
              await trackMediaUsage(media._id, {
                entityType: "Product",
                entityId: createdDoc._id,
                fieldName: "image",
                label: createdDoc.name,
              });
            }
          } catch (mErr) {
            console.warn("Media usage tracking warning:", mErr);
          }
        }
      } catch (err) {
        console.error(`Error creating product at row ${i + 1}:`, err);
        errors.push({ row: i + 1, message: err.message });
      }
    }

    // 3. Process Updates
    for (let j = 0; j < updates.length; j++) {
      const { id, data } = updates[j];
      try {
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
          errors.push({ id, message: "Invalid product ID" });
          continue;
        }

        const updateFields = {};

        if (data.name !== undefined) {
          if (!String(data.name).trim()) {
            errors.push({ id, field: "name", message: "Product name cannot be empty" });
            continue;
          }
          updateFields.name = String(data.name).trim();
        }

        if (data.sku !== undefined) updateFields.sku = String(data.sku).trim();

        if (data.price !== undefined) {
          const numPrice = Number(data.price);
          if (isNaN(numPrice) || numPrice < 0) {
            errors.push({ id, field: "price", message: "Price must be a valid number" });
            continue;
          }
          updateFields.price = numPrice;
        }

        // Fetch existing product to resolve current state and preserve gallery images
        let existing = null;
        try {
          const q = Product.findOne({ _id: id, tenantId });
          if (q && typeof q.select === "function") {
            const sq = q.select("stock manageStock images");
            existing = sq && typeof sq.lean === "function" ? await sq.lean() : await sq;
          } else {
            existing = await q;
          }
        } catch (findErr) {
          console.error("Error looking up existing product:", findErr);
          existing = null;
        }

        if (!existing) {
          // If existing could not be found, attempt findOneAndUpdate directly
          existing = { stock: 0, manageStock: true, images: [] };
        }

        if (data.compareAtPrice !== undefined) {
          updateFields.compareAtPrice =
            data.compareAtPrice !== "" && data.compareAtPrice !== null && !isNaN(Number(data.compareAtPrice)) && Number(data.compareAtPrice) > 0
              ? Number(data.compareAtPrice)
              : null;
        }

        if (data.stock !== undefined || data.manageStock !== undefined) {
          const currentStock = data.stock !== undefined
            ? (data.stock !== "" && !isNaN(Number(data.stock)) ? Math.max(0, parseInt(data.stock, 10)) : 0)
            : (existing.stock ?? 0);
          const currentManage = data.manageStock !== undefined
            ? Boolean(data.manageStock)
            : (existing.manageStock ?? true);

          if (data.stock !== undefined) updateFields.stock = currentStock;
          if (data.manageStock !== undefined) updateFields.manageStock = currentManage;
          updateFields.availabilityStatus = !currentManage || currentStock > 0 ? "In Stock" : "Out of Stock";
        }

        if (data.status !== undefined) {
          updateFields.status = ["Draft", "Published"].includes(data.status) ? data.status : "Draft";
        }
        if (data.isFeatured !== undefined) updateFields.isFeatured = Boolean(data.isFeatured);

        if (data.category !== undefined) {
          const catData = resolveCategory(data.category);
          Object.assign(updateFields, catData);
        }

        if (data.tags !== undefined) {
          if (Array.isArray(data.tags)) {
            updateFields.tags = data.tags;
          } else if (typeof data.tags === "string" && data.tags.trim()) {
            updateFields.tags = data.tags.split(",").map((t) => t.trim()).filter(Boolean);
          } else {
            updateFields.tags = [];
          }
        }

        if (data.image !== undefined) {
          const img = String(data.image || "").trim();
          updateFields.image = img;
          if (!img) {
            updateFields.images = [];
          } else {
            const currentImages = Array.isArray(existing.images) ? existing.images : [];
            if (currentImages.length > 0) {
              const rest = currentImages.filter((u) => u !== img);
              updateFields.images = [img, ...rest];
            } else {
              updateFields.images = [img];
            }
          }
        }

        if (data.shortDescription !== undefined) {
          updateFields.shortDescription = String(data.shortDescription);
        }

        const updated = await Product.findOneAndUpdate(
          { _id: id, tenantId },
          { $set: updateFields },
          { new: true, runValidators: true }
        );

        if (updated) {
          updatedCount++;
        } else {
          errors.push({ id, message: "Product not found or unauthorized" });
        }
      } catch (err) {
        console.error(`Error updating product ${id}:`, err);
        errors.push({ id, message: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      createdCount,
      updatedCount,
      deletedCount,
      errors,
    });
  } catch (error) {
    console.error("[Bulk POST Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
