"use client";

import ProductCard from "./ProductCard";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useSiteData } from "@/context/SiteContext";
import { useState } from "react";

export default function ProductSection({
  title,
  products = [],
  seriesLabel,
  ctaLabel,
  headingLevel = "h2"
}) {
  const siteData = useSiteData();
  const [activeCategory, setActiveCategory] = useState("ALL");

  const productLabels = {
    seriesLabel: seriesLabel || siteData?.products?.labels?.seriesLabel || "U VAPE CATALOG",
    ctaLabel: ctaLabel || siteData?.products?.labels?.archiveIndex || "Explore All Vapes"
  };

  const activeProducts = (products || []).filter(
    (p) => p && !p.isDeleted && p.status === "Published"
  );

  if (!siteData) return null;

  if (activeProducts.length === 0) {
    return (
      <section className="py-4 bg-background">
        <div className="container mx-auto px-2 sm:px-4 md:px-8 py-8 text-center">
          <div className="py-12 bg-neutral-50 rounded-2xl border border-border/40">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              No products are currently available in this collection.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Filter Categories
  const categories = ["ALL", ...Array.from(new Set(activeProducts.map(p => p.category).filter(Boolean)))];

  const filteredProducts = activeCategory === "ALL" 
    ? activeProducts 
    : activeProducts.filter(p => p.category === activeCategory);

  const MotionHeading = motion[headingLevel] || motion.h2;
  const displayProducts = filteredProducts.slice(0, 16);

  return (
    <section className="py-6 md:py-12 bg-background">
      <div className="container mx-auto px-2 sm:px-4 md:px-8 py-10 md:py-16 overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 md:mb-12 gap-6 pb-6 border-b border-black/10">
          <div className="space-y-3 md:space-y-4 flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-black text-white px-3.5 py-1.5 rounded-full shadow-md"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <p className="text-[8px] md:text-[10px] font-bold tracking-[0.2em] uppercase">
                {productLabels.seriesLabel}
              </p>
            </motion.div>
            <MotionHeading
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-[26px] sm:text-[34px] md:text-[42px] font-black heading-font tracking-tighter text-[#000000] uppercase leading-tight truncate"
            >
              {title}
            </MotionHeading>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-4 md:gap-8 shrink-0 w-full lg:w-auto">
            {/* CTA Button */}
            <Link
              href="/shop"
              className="group relative flex items-center gap-2 sm:gap-4 border border-black/20 hover:border-black bg-black text-white px-6 py-3.5 sm:px-8 sm:py-4 rounded-full font-bold text-[11px] sm:text-xs md:text-[13px] uppercase tracking-[0.2em] overflow-hidden transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-xl"
            >
              <span className="relative z-10">{productLabels.ctaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 relative z-10 transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Category Filter Pills (If multiple categories exist) */}
        {categories.length > 2 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mb-8 pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-black text-white shadow-md scale-105"
                    : "bg-neutral-100 text-black/70 hover:bg-neutral-200"
                }`}
              >
                {cat === "ALL" ? "All Products" : cat}
              </button>
            ))}
          </div>
        )}

        {/* Responsive Grid Area */}
        <div className="relative -mx-2 sm:-mx-4 md:-mx-8 px-2 sm:px-4 md:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial="hidden"
              animate="visible"
              exit="hidden"
              viewport={{ once: true, amount: 0.1 }}
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-10 gap-x-4 sm:gap-x-6 md:gap-x-8"
            >
              {displayProducts.map((product) => {
                return (
                  <motion.div
                    key={product._id || product.id}
                    variants={{
                      hidden: { opacity: 0, y: 25, scale: 0.97 },
                      visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
                    }}
                    className="w-full h-full"
                  >
                    <ProductCard product={product} />
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
