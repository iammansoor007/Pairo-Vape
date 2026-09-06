import { describe, it, expect } from "vitest";
import { normalizePath, isReservedPath } from "../lib/redirect-resolver";
import { sanitizeSEOString, validateAndParseJsonLd, resolveSEOMetadata, normalizeCanonicalUrl } from "../lib/seo-resolver";

describe("SEO - Path Normalization", () => {
  it("should lowercase and trim paths", () => {
    expect(normalizePath("  /Product/vape-Jacket/   ")).toBe("/product/vape-jacket");
  });

  it("should strip trailing slashes but preserve root", () => {
    expect(normalizePath("/shop/")).toBe("/shop");
    expect(normalizePath("/")).toBe("/");
  });

  it("should clean duplicate slashes", () => {
    expect(normalizePath("///product//vape-jacket///")).toBe("/product/vape-jacket");
  });

  it("should decode URI components", () => {
    expect(normalizePath("/shop?category=mens%20jackets")).toBe("/shop?category=mens jackets");
  });

  it("should keep absolute URLs intact", () => {
    expect(normalizePath("https://uvapestore.com/product/jacket")).toBe("https://uvapestore.com/product/jacket");
  });
});

describe("SEO - Reserved Path Safeguards", () => {
  it("should flag reserved paths correctly", () => {
    expect(isReservedPath("/admin")).toBe(true);
    expect(isReservedPath("/admin/products")).toBe(true);
    expect(isReservedPath("/api/products")).toBe(true);
    expect(isReservedPath("/checkout/success")).toBe(true);
    expect(isReservedPath("cart")).toBe(true);
  });

  it("should not flag normal storefront paths", () => {
    expect(isReservedPath("/product/vape-jacket")).toBe(false);
    expect(isReservedPath("/blog/style-guide")).toBe(false);
    expect(isReservedPath("/about-us")).toBe(false);
  });
});

describe("SEO - Metadata Sanitization", () => {
  it("should strip script tags and HTML elements", () => {
    const dirty = "Premium <script>alert('XSS')</script> vape <b>Jacket</b>";
    expect(sanitizeSEOString(dirty).replace(/\s+/g, " ")).toBe("Premium vape Jacket");
  });

  it("should strip quotes to prevent breaking meta tags", () => {
    const dirty = 'Modern "vape" jacket\'s story';
    expect(sanitizeSEOString(dirty)).toBe("Modern vape devices story");
  });
});

describe("SEO - JSON-LD Schema Validation", () => {
  it("should parse valid JSON-LD schemas and ensure @context", () => {
    const valid = '{"@type": "Product", "name": "vape Co."}';
    const parsed = validateAndParseJsonLd(valid);
    expect(parsed).toBeDefined();
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@type"]).toBe("Product");
  });

  it("should fail gracefully and return null for invalid JSON", () => {
    const invalid = '{"@type": "Product", "name": "vape Co."'; // Missing closing brace
    expect(validateAndParseJsonLd(invalid)).toBeNull();
  });
});

describe("SEO - Centralized Metadata Resolver", () => {
  it("should compile products with correct metadata and canonical fallback", async () => {
    const mockProduct = {
      name: "premium vape Coat",
      shortDescription: "Luxurious premium vape coat.",
      slug: "handcrafted-vape-coat",
      price: 1200,
      stock: 5,
      seo: {
        title: "Buy premium vape Coat Online | U Vape",
        description: "Custom SEO description override.",
        noIndex: false,
        noFollow: true
      }
    };

    const { metadata, structuredData } = await resolveSEOMetadata({
      entity: mockProduct,
      type: "product",
      path: "/product/handcrafted-vape-coat"
    });

    expect(metadata.title).toBe("Buy premium vape Coat Online | U Vape");
    expect(metadata.description).toBe("Custom SEO description override.");
    expect(metadata.alternates.canonical).toBe("https://uvapestore.com/product/handcrafted-vape-coat");
    expect(metadata.robots).toBe("noindex, nofollow");
    expect(metadata.twitter.site).toBe("@uvapestore");
    expect(metadata.twitter.creator).toBe("@uvapestore");

    expect(structuredData).toBeDefined();
    const productSchema = structuredData["@graph"] 
      ? structuredData["@graph"].find(x => x["@type"] === "Product")
      : structuredData;
    expect(productSchema["@type"]).toBe("Product");
    expect(productSchema.offers.price).toBe(1200);
  });

  it("should fall back to global settings when entity SEO is empty", async () => {
    const mockBlog = {
      title: "The vape Heritage",
      excerpt: "Deep dive into the craftsmanship.",
      slug: "vape-heritage",
      createdAt: "2026-05-25T12:00:00.000Z"
    };

    const { metadata, structuredData } = await resolveSEOMetadata({
      entity: mockBlog,
      type: "blog"
    });

    expect(metadata.title).toBe("The vape Heritage");
    expect(metadata.description).toBe("Deep dive into the craftsmanship.");
    expect(metadata.alternates.canonical).toBe("https://uvapestore.com/blog/vape-heritage");

    expect(structuredData).toBeDefined();
    expect(structuredData["@graph"]).toBeDefined();
    const article = structuredData["@graph"].find(x => x["@type"] === "Article");
    expect(article).toBeDefined();
    expect(article.headline).toBe("The vape Heritage");
  });

  it("should resolve image fallback hierarchy correctly", async () => {
    const mockEntity = {
      title: "Test Page",
      image: "/featured.jpg",
      images: ["/first-in-array.jpg"],
      seo: {
        ogImage: "/seo-og.jpg",
        twitterImage: "/seo-tw.jpg"
      }
    };

    // Case 1: Custom SEO images present
    const res1 = await resolveSEOMetadata({
      entity: mockEntity,
      type: "page",
      fallbackImage: "/global.jpg"
    });
    expect(res1.metadata.openGraph.images[0].url).toBe("https://uvapestore.com/seo-og.jpg");
    expect(res1.metadata.twitter.images[0]).toBe("https://uvapestore.com/seo-tw.jpg");

    // Case 2: Custom SEO images missing, should fall back to entity featured image
    const mockEntityNoSeoImage = {
      title: "Test Page",
      image: "/featured.jpg",
      seo: {}
    };
    const res2 = await resolveSEOMetadata({
      entity: mockEntityNoSeoImage,
      type: "page",
      fallbackImage: "/global.jpg"
    });
    expect(res2.metadata.openGraph.images[0].url).toBe("https://uvapestore.com/featured.jpg");
    expect(res2.metadata.twitter.images[0]).toBe("https://uvapestore.com/featured.jpg");

    // Case 3: All missing, should fall back to global image
    const mockEntityEmpty = {
      title: "Test Page"
    };
    const res3 = await resolveSEOMetadata({
      entity: mockEntityEmpty,
      type: "page",
      fallbackImage: "/global.jpg"
    });
    expect(res3.metadata.openGraph.images[0].url).toBe("https://uvapestore.com/global.jpg");
    expect(res3.metadata.twitter.images[0]).toBe("https://uvapestore.com/global.jpg");
  });

  it("should normalize and deduplicate canonical query parameters", () => {
    expect(normalizeCanonicalUrl("https://uvapestore.com/shop?category=Men&color=black&size=XL&type=Jackets"))
      .toBe("https://uvapestore.com/shop?category=men&type=jackets");
  });

  it("should force noindex/nofollow on draft pages", async () => {
    const mockBlog = {
      title: "Draft Story",
      excerpt: "Deep dive into the craftsmanship.",
      slug: "draft-story",
      status: "Draft",
      seo: {
        noIndex: false,
        noFollow: false
      }
    };

    const { metadata } = await resolveSEOMetadata({
      entity: mockBlog,
      type: "blog"
    });

    expect(metadata.robots).toBe("noindex, nofollow");
  });
});
