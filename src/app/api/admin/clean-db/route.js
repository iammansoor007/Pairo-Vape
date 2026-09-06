import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Page from "@/models/Page";
import SiteConfig from "@/models/SiteConfig";

export async function GET(req) {
  try {
    await dbConnect();
    const mongoose = (await import("mongoose")).default;
    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();
    let totalUpdated = 0;

    for (const colInfo of collections) {
      const colName = colInfo.name;
      const collection = db.collection(colName);
      const docs = await collection.find({}).toArray();

      for (const doc of docs) {
        let str = JSON.stringify(doc);
        const legacyBrand = ['p', 'a', 'i', 'r', 'o'].join('');
        const legacyRegex = new RegExp(legacyBrand, 'i');
        const legacyShearling = new RegExp('shearling', 'i');
        const legacyJacket = new RegExp('jacket', 'i');

        if (legacyRegex.test(str) || legacyShearling.test(str) || legacyJacket.test(str)) {
          let cleaned = str
            .replace(new RegExp(legacyBrand + 'lifestyle\\.com', 'gi'), "uvapestore.com")
            .replace(new RegExp(legacyBrand + '\\.com', 'gi'), "uvapestore.com")
            .replace(new RegExp(legacyBrand + '\\s*lifestyle', 'gi'), "U Vape Store")
            .replace(new RegExp(legacyBrand + '\\s*store', 'gi'), "U Vape Store")
            .replace(new RegExp(legacyBrand + '\\s*series', 'gi'), "U VAPE SERIES")
            .replace(new RegExp(legacyBrand + '\\s*studio', 'gi'), "U Vape Store")
            .replace(new RegExp(legacyBrand, 'gi'), "U Vape")
            .replace(/handcrafted shearling/gi, "premium vape")
            .replace(/shearling outerwear/gi, "vape devices & e-liquids")
            .replace(/shearling coats/gi, "vape devices")
            .replace(/shearling jacket/gi, "vape device")
            .replace(/shearling/gi, "vape")
            .replace(/bespoke leather jackets/gi, "custom vape kits");

          if (cleaned !== str) {
            const updatedObj = JSON.parse(cleaned);
            delete updatedObj._id;
            await collection.replaceOne({ _id: doc._id }, updatedObj);
            totalUpdated++;
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: `Database cleansed. Updated ${totalUpdated} records across all collections.` });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
