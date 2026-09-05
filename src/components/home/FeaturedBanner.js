"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { ArrowRight } from "lucide-react";
import siteData from "@/lib/data.json";
import { getProductUrl, getCategoryUrl } from "@/lib/routes";

export default function FeaturedBanner({
  title,
  description,
  badge1,
  badge2,
  product: propProduct,
  ctaText,
  linkType,
  productId,
  collectionId,
  image: propImage,
  features: propFeatures
}) {
  const product = propProduct || { name: "Product Name", price: "000", image: "/placeholder.jpg" };

  const bannerData = {
    title: title || product.name || "FLAGSHIP DISPOSABLE VAPES",
    description: description || "Premium disposable vapes and authentic e-liquids engineered with sub-ohm mesh coils for pure flavor and dense cloud production.",
    badge1: badge1 || "U Vape Edition",
    badge2: badge2 || "Pro Mesh Series",
    ctaText: ctaText || "BUY NOW",
    image: propImage || product.image
  };

  return (
    <section className="container mx-auto px-2 sm:px-4 md:px-8 my-8 md:my-14">
      <div className="bg-neutral-950 text-white rounded-[28px] md:rounded-[44px] overflow-hidden relative min-h-[420px] md:min-h-[480px] flex items-center border border-neutral-800 shadow-2xl">
        {/* Product Image - Optimized for all screens */}
        <div className="absolute inset-0 w-full h-full md:w-1/2 md:left-auto md:right-0">
          <Image
            src={bannerData.image}
            alt={bannerData.title}
            fill
            className="object-cover object-center md:object-left opacity-35 md:opacity-90 contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent md:hidden" />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-neutral-950/50 to-neutral-950 hidden md:block" />
        </div>

        {/* Content Area - Responsive Fitting */}
        <div className="w-full relative z-10 px-6 md:px-16 py-12 md:py-16 lg:py-20">
          <div className="max-w-full md:max-w-lg lg:max-w-xl space-y-6 md:space-y-8">
            {/* Tagline style matching Hero */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                21+ Adult Vape Verified
              </span>
              <div className="hidden sm:block h-[1.5px] w-6 bg-white/20" />
              <span className="text-white/70 text-[10px] md:text-xs font-bold tracking-[0.25em] uppercase">
                {[bannerData.badge1, bannerData.badge2].filter(Boolean).join(" • ")}
              </span>
            </div>

            {/* Typography matching Hero */}
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white heading-font leading-[1.05] tracking-tight max-w-[15ch] md:max-w-none uppercase">
                {bannerData.title}
              </h2>
              <p className="text-white/80 text-xs md:text-base lg:text-lg max-w-md leading-relaxed font-sans font-normal">
                {bannerData.description}
              </p>
            </div>

            {/* Vape Features */}
            {(() => {
              const defaultFeatures = [
                { text: "Dual Mesh Coil", icon: "Zap" },
                { text: "Smart LED Display", icon: "CheckCircle2" },
                { text: "5% Salt Nicotine", icon: "ShieldCheck" }
              ];
              const features = propFeatures && propFeatures.length > 0 ? propFeatures : defaultFeatures;
              return (
                <div className="flex flex-wrap items-center gap-4 md:gap-6 pt-4 border-t border-white/15">
                  {features.map((feat, index) => {
                    const IconComponent = LucideIcons[feat.icon] || LucideIcons.Zap;
                    return (
                      <div key={index} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                        <IconComponent className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[9px] md:text-[10px] font-bold text-white/90 uppercase tracking-wider">
                          {feat.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div className="pt-2">
              <Link
                href={
                  linkType === "product" ? getProductUrl(propProduct || { slug: productId }) :
                    linkType === "collection" && collectionId ? getCategoryUrl(collectionId) :
                      "/shop"
                }
                className="group flex items-center justify-center gap-3 bg-white text-black px-7 sm:px-9 md:px-10 py-3.5 md:py-4 rounded-full font-bold text-[11px] sm:text-xs md:text-sm tracking-widest uppercase transition-all duration-300 hover:bg-neutral-200 hover:scale-[1.03] active:scale-95 inline-flex shadow-2xl cursor-pointer"
              >
                <span>{bannerData.ctaText}</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}