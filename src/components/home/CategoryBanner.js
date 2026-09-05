"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useSiteData } from "@/context/SiteContext";
import { getCategoryUrl } from "@/lib/routes";

export default function CategoryBanner({
  title,
  label,
  viewAll,
  categories: propCategories,
  headingLevel = "h2"
}) {
  const siteData = useSiteData();
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const categoriesConfig = {
    title: title || siteData?.categories?.title || "EXPLORE VAPE CATEGORIES",
    label: label || siteData?.categories?.label || "U VAPE COLLECTIONS",
    viewAll: viewAll || siteData?.categories?.viewAll || "Explore All",
    exploreSingle: siteData?.categories?.exploreSingle || "Explore",
    exploreFull: siteData?.categories?.exploreFull || "Explore Collection"
  };

  const displayCategories = (propCategories && propCategories.length > 0)
    ? propCategories.slice(0, 3)
    : [];

  // Bento Spans [1 : 2 : 1]
  const layoutSpans = [
    "lg:col-span-1",
    "lg:col-span-2",
    "lg:col-span-1"
  ];

  if (displayCategories.length === 0) return null;

  const HeadingTag = headingLevel;

  return (
    <section className="container mx-auto px-2 sm:px-4 md:px-8 py-4 md:py-8">
      <div className="bg-neutral-950 text-white rounded-[32px] md:rounded-[44px] shadow-2xl overflow-hidden py-14 md:py-20 px-6 md:px-14 border border-neutral-800">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-14 gap-6 pb-6 border-b border-white/10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/20 px-3.5 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[9px] md:text-[11px] font-bold tracking-[0.2em] uppercase">
                {categoriesConfig.label}
              </p>
            </div>
            <HeadingTag className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black heading-font tracking-tighter text-white uppercase leading-none truncate">
              {categoriesConfig.title}
            </HeadingTag>
          </div>

          <Link href="/shop" className="group relative hidden sm:flex items-center gap-3 border border-white/30 bg-white text-black px-8 py-3.5 rounded-full font-bold text-[11px] uppercase tracking-[0.2em] overflow-hidden transition-all duration-500 hover:bg-neutral-200 active:scale-95 shadow-xl">
            <span className="relative z-10">{categoriesConfig.viewAll}</span>
            <ArrowRight className="w-4 h-4 relative z-10 transition-transform duration-500 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {displayCategories.map((category, index) => {
            const isSmall = index === 0 || index === 2;
            const exploreText = index === 1 ? (categoriesConfig.exploreFull || "Explore Collection") : (categoriesConfig.exploreSingle || "Explore");

            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`group relative h-[360px] md:h-[460px] rounded-[28px] md:rounded-[36px] overflow-hidden bg-neutral-900 border border-neutral-800 ${layoutSpans[index]}`}
              >
                <Link href={getCategoryUrl(category)} className="absolute inset-0 z-20">
                  <span className="sr-only">View {category.name}</span>
                </Link>

                {/* Images */}
                <div className="absolute inset-0 transition-transform duration-1000 group-hover:scale-105">
                  {category.image ? (
                    <Image src={category.image} alt={category.imageAlts?.[category.image] || category.name || "Vape Category"} fill className="object-cover brightness-[0.8]" priority={index === 1} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center text-white/20 font-bold uppercase tracking-widest text-[11px]">No Image</div>
                  )}
                </div>

                {/* Overlay for Text Visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />

                {/* Content Area */}
                <div className={`absolute inset-0 p-6 sm:p-8 md:p-12 flex flex-col justify-end items-center text-center ${isSmall ? '' : 'sm:items-start sm:text-left'}`}>
                  <div className={`space-y-4 w-full flex flex-col items-center ${isSmall ? '' : 'sm:items-start'}`}>
                    <span className="inline-block text-[9px] md:text-[10px] font-extrabold uppercase tracking-[0.25em] text-emerald-400 bg-emerald-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/30">
                      21+ PREMIUM VAPE
                    </span>

                    <h3 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-white uppercase tracking-tight leading-[0.95]">
                      {category.name}
                    </h3>

                    <div className={`w-full flex justify-center ${isSmall ? '' : 'sm:justify-start'}`}>
                      <button className="group/btn relative overflow-hidden bg-white text-black px-7 py-3 sm:px-9 sm:py-3.5 rounded-full font-bold text-[9px] sm:text-[11px] uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl active:scale-95">
                        <span className="relative z-10 flex items-center gap-2 sm:gap-3">
                          {exploreText}
                          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
