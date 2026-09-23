import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";

const NEW_PAGES = [
  {
    title: "Gallery",
    slug: "gallery",
    template: "gallery",
    status: "Published",
    isSystem: true,
    isHomePage: false,
    sections: [
      {
        id: "gallery-grid-1",
        type: "gallery_grid",
        config: {
          sectionTitle: "OUR COLLECTION",
          sectionLabel: "FEATURED PRODUCTS",
          sectionDescription: "A carefully curated selection of our finest devices and e-liquids.",
          emptyText: "Gallery coming soon."
        }
      }
    ],
    seo: {
      title: "Gallery | U VAPE Collection",
      description: "Browse our curated gallery of premium vape devices, e-liquids and accessories.",
      ogImage: ""
    }
  }
];

export async function POST(req) {
  // Admin only
  const session = await getServerSession(authOptions);
  if (!session?.user?.isStaff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const db = mongoose.connection.db;
    const pagesCollection = db.collection("pages");

    const results = [];

    for (const pageData of NEW_PAGES) {
      await pagesCollection.deleteOne({ slug: pageData.slug });

      await pagesCollection.insertOne({
        ...pageData,
        tenantId: "DEFAULT_STORE",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      results.push({ slug: pageData.slug, status: "seeded", title: pageData.title });
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error("[Seed New Pages Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
