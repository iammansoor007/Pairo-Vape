"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight, Ruler } from "lucide-react";

export default function SizeChartHero({
  title = "SIZE GUIDE",
  subtitle = "Find your perfect fit with our comprehensive size charts. Crafted to help you choose the right size every time.",
  label = "SIZING",
  image = "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2000&auto=format&fit=crop",
  mobileImage = "",
  buttonText = "Shop Now",
  buttonLink = "/shop",
  breadcrumb = "Size Chart",
  headingLevel = "h1",
}) {
  const Heading = headingLevel;

  return (
    <section className="container mx-auto px-2 sm:px-4 md:px-8 my-6">
      <div className="relative h-[420px] md:h-[540px] lg:h-[620px] rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden bg-primary">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative h-full flex flex-col justify-between p-8 md:p-12 lg:p-16">
          {/* Top Row */}
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full"
            >
              <Ruler className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-[11px] font-bold uppercase tracking-[3px]">{label}</span>
            </motion.div>

            <motion.nav
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="hidden md:flex items-center gap-1.5 text-white/60 text-[12px]"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-white font-medium">{breadcrumb}</span>
            </motion.nav>
          </div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="max-w-2xl"
          >
            <Heading className="font-heading text-white text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight mb-5">
              {title}
            </Heading>
            <p className="text-white/75 text-base md:text-lg leading-relaxed mb-8 max-w-lg">
              {subtitle}
            </p>
            {buttonText && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={buttonLink}
                  className="inline-flex items-center gap-3 bg-white text-primary px-7 py-3.5 font-bold text-[13px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all duration-300 rounded-sm group"
                >
                  {buttonText}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            )}
          </motion.div>

          {/* Bottom */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-white/20" />
            <span className="text-white/40 text-[10px] uppercase tracking-[4px] font-medium">U Vape Size Guide</span>
            <div className="h-px flex-1 bg-white/20" />
          </div>
        </div>
      </div>
    </section>
  );
}
