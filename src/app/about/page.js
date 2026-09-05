import { resolvePageSections } from "@/lib/page-data-resolver";
import { notFound, permanentRedirect } from "next/navigation";
import { resolveSEOMetadata, escapeJsonLd } from "@/lib/seo-resolver";
import { resolvePageAndTemplate } from "@/lib/page-cache";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { page } = await resolvePageAndTemplate("about", "about");
  
  if (page && page.slug !== "about") {
    return {};
  }

  const { metadata } = await resolveSEOMetadata({
    entity: page,
    type: "page",
    fallbackTitle: "About Us | U Vape - Premium Disposables & E-Liquids",
    path: "/about"
  });

  return metadata;
}

export default async function AboutPage() {
  const { page, templateInfo } = await resolvePageAndTemplate("about", "about");

  if (page && page.slug !== "about") {
    permanentRedirect(`/${page.slug}`);
  }

  // Throw 404 if the page is draft and not viewable
  if (page.status !== "Published") {
    notFound();
  }

  let resolvedSections = [];
  if (page.sections?.length > 0) {
    resolvedSections = await resolvePageSections(page.sections);
  }

  // Ensure sections are sorted correctly
  const sortedSections = JSON.parse(
    JSON.stringify(resolvedSections.sort((a, b) => (a.order || 0) - (b.order || 0)))
  );

  const { structuredData } = await resolveSEOMetadata({
    entity: page,
    type: "page",
    path: "/about"
  });

  const TemplateComponent = templateInfo.component;

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: escapeJsonLd(structuredData) }}
        />
      )}
      <TemplateComponent page={page} sections={sortedSections} />
    </>
  );
}
