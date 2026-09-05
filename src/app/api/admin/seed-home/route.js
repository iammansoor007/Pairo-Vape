import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Page from "@/models/Page";
import SiteConfig from "@/models/SiteConfig";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.isStaff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  try {
    const siteConfig = await SiteConfig.findOne({ key: 'main' }).lean();
    if (!siteConfig) return NextResponse.json({ error: "SiteConfig not found" }, { status: 404 });

    const homePage = {
      title: "Homepage",
      slug: "home",
      status: "Published",
      isSystem: true,
      sections: [
        {
          id: "hero-1",
          type: "hero_slider",
          enabled: true,
          order: 0,
          config: {
            slides: siteConfig.hero.slides,
            brand: siteConfig.brand,
            labels: siteConfig.hero.labels
          }
        },
        {
          id: "new-arrivals-1",
          type: "product_grid",
          enabled: true,
          order: 1,
          config: {
            title: "NEW ARRIVALS",
            seriesLabel: "U VAPE SERIES",
            ctaLabel: "Explore All Vapes",
            limit: 16,
            layout: "carousel"
          }
        },
        {
          id: "marquee-1",
          type: "feature_marquee",
          enabled: true,
          order: 2,
          config: {
            items: [
              { text: "21+ Verified Store" },
              { text: "Express Delivery" },
              { text: "100% Authentic Vapes" },
              { text: "Flavor Guarantee" },
              { text: "Worldwide Delivery" },
              { text: "24/7 Vapers Support" }
            ],
            speed: 40
          }
        },
        {
          id: "top-selling-1",
          type: "product_grid",
          enabled: true,
          order: 3,
          config: {
            title: "TOP SELLING VAPES",
            seriesLabel: "U VAPE SERIES",
            ctaLabel: "Shop Top Sellers",
            limit: 16,
            layout: "carousel"
          }
        },
        {
          id: "banner-1",
          type: "banner_feature",
          enabled: true,
          order: 4,
          config: {
             title: "FLAGSHIP DISPOSABLE VAPES",
             description: "Premium disposable vapes engineered with dual mesh coils for rich flavor.",
             badge1: "U Vape Edition",
             badge2: "Pro Series"
          }
        },
        {
          id: "categories-1",
          type: "category_showcase",
          enabled: true,
          order: 5,
          config: {
            title: siteConfig.categories?.title || "Vape Collections",
            label: siteConfig.categories?.label || "U Vape Collections",
            viewAll: "Explore All",
            categoryIds: [] 
          }
        },
        {
          id: "blogs-1",
          type: "blog_grid",
          enabled: true,
          order: 6,
          config: {
            title: "VAPING GUIDES & FLAVOR RELEASES",
            label: "U VAPE JOURNAL",
            limit: 6,
            readMore: "READ GUIDE"
          }
        },
        {
          id: "testimonials-1",
          type: "testimonials",
          enabled: true,
          order: 7,
          config: {
            title: siteConfig.testimonials?.title || "WHAT OUR VAPERS SAY",
            label: siteConfig.testimonials?.label || "VERIFIED REVIEWS",
            buttonText: siteConfig.testimonials?.buttonText || "WRITE A REVIEW",
            reviews: siteConfig.testimonials?.reviews || []
          }
        }
      ],
      template: "home",
      seo: {
        title: "U Vape Store | Premium Disposables & E-Liquids",
        description: "Experience premium disposable vapes, salt nics, and authentic vape gear at U Vape Store."
      }
    };

    const updated = await Page.findOneAndUpdate(
      { slug: 'home', tenantId: 'DEFAULT_STORE' },
      { ...homePage, updatedBy: session.user.id },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json({ message: "Home page seeded", page: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
