import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Page from "@/models/Page";
import SiteConfig from "@/models/SiteConfig";

export async function GET(req) {
  try {
    await dbConnect();

    // 1. Update SiteConfig
    const siteConfig = await SiteConfig.findOne({ key: 'main' });
    if (siteConfig) {
      let str = JSON.stringify(siteConfig);
      str = str
        .replace(/pairo\s*series/gi, "U VAPE SERIES")
        .replace(/pairo\s*store/gi, "U VAPE STORE")
        .replace(/pairo\s*studio/gi, "U VAPE STORE")
        .replace(/pairo/gi, "U VAPE")
        .replace(/raw luxury outerwear/gi, "PREMIUM VAPES & E-LIQUIDS")
        .replace(/shearling/gi, "DISPOSABLE")
        .replace(/jacket/gi, "VAPE");
      const cleaned = JSON.parse(str);
      delete cleaned._id;
      await SiteConfig.replaceOne({ _id: siteConfig._id }, cleaned);
    }

    // 2. Update Pages
    const pages = await Page.find({});
    for (const page of pages) {
      let str = JSON.stringify(page);
      if (/pairo/i.test(str) || /shearling/i.test(str)) {
        str = str
          .replace(/pairo\s*series/gi, "U VAPE SERIES")
          .replace(/pairo\s*store/gi, "U VAPE STORE")
          .replace(/pairo\s*studio/gi, "U VAPE STORE")
          .replace(/pairo/gi, "U VAPE")
          .replace(/raw luxury outerwear/gi, "PREMIUM VAPES & E-LIQUIDS")
          .replace(/shearling/gi, "DISPOSABLE")
          .replace(/jacket/gi, "VAPE");
        const cleanedPage = JSON.parse(str);
        delete cleanedPage._id;
        await Page.replaceOne({ _id: page._id }, cleanedPage);
      }
    }

    return NextResponse.json({ success: true, message: "Database cleansed of Pairo terms." });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
