const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI.trim().replace(/^["'](.+)["']$/, "$1");

async function seedSystemPages() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully.");

  const db = mongoose.connection.db;
  const pagesCollection = db.collection("pages");

  const systemPages = [
    {
      slug: "blog",
      title: "Blog / Journal",
      description: "Manage vape guides, flavor profiles, and news.",
      seo: {
        title: "Blog | U Vape Journal",
        description: "Explore vape guides, flavor profiles, and news from U Vape Store.",
        keywords: ["blog", "journal", "u vape", "vape guides"],
        noIndex: false,
        noFollow: false
      }
    },
    {
      slug: "collections",
      title: "Collections",
      description: "Manage your categories/collections overview page.",
      seo: {
        title: "Collections | U Vape Store",
        description: "Browse all U Vape collections — premium disposables, e-liquids, salt nics, and vape kits.",
        keywords: ["collections", "categories", "u vape"],
        noIndex: false,
        noFollow: false
      }
    },
    {
      slug: "shop",
      title: "Shop All Catalog",
      description: "Manage your Shop All products catalog page.",
      seo: {
        title: "Shop All | U Vape Store",
        description: "Browse U Vape's premium disposable vapes, e-liquids, salt nics, and vape kits.",
        keywords: ["shop all", "buy disposable vape", "u vape store"],
        noIndex: false,
        noFollow: false
      }
    }
  ];

  for (const page of systemPages) {
    const pageData = {
      title: page.title,
      slug: page.slug,
      description: page.description,
      status: "Published",
      template: "default",
      isSystem: true,
      seo: page.seo,
      tenantId: "DEFAULT_STORE",
      updatedAt: new Date()
    };

    const result = await pagesCollection.updateOne(
      { slug: page.slug },
      { 
        $set: pageData,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    console.log(`Page '${page.slug}' processed:`, result.upsertedCount > 0 ? "Inserted" : "Updated");
  }

  console.log("System pages SEO seed complete.");
  await mongoose.disconnect();
}

seedSystemPages().catch(err => {
  console.error("Error seeding system pages:", err);
  process.exit(1);
});
