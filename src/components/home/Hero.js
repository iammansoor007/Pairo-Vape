"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import MarqueeSection from "./MarqueeSection";
import { useSiteData } from "@/context/SiteContext";


export default function Hero({
  slides: propSlides,
  brand: propBrand,
  labels: propLabels,
  marqueeItems: propMarqueeItems,
  headingLevel = "h1"
}) {
  const siteData = useSiteData();

  // Use props if available (Page Builder mode), otherwise fallback to SiteContext (Legacy mode)
  const heroData = {
    hero: {
      slides: propSlides || siteData?.hero?.slides || [],
      labels: propLabels || siteData?.hero?.labels || { viewCollection: "View Collection" },
      marqueeItems: propMarqueeItems || siteData?.hero?.marqueeItems || []
    },
    brand: propBrand || siteData?.brand || { tagline: "U Vape | Premium Disposables & E-Liquids" }
  };

  const { hero, brand } = heroData;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextSlide = () => {
    if (!hero.slides.length) return;
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % hero.slides.length);
  };

  const prevSlide = () => {
    if (!hero.slides.length) return;
    setDirection(-1);
    setCurrentSlide((prev) => (prev === 0 ? hero.slides.length - 1 : prev - 1));
  };

  useEffect(() => {
    if (!hero.slides.length) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentSlide((prev) => (prev + 1) % hero.slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [hero.slides.length]);

  if ((!siteData && !propSlides) || !hero.slides || hero.slides.length === 0) return <div className="h-[550px] md:h-[650px] lg:h-[750px] bg-black/5 rounded-[32px] md:rounded-[40px] m-4 md:m-8 animate-pulse" />;

  const slideVariants = {
    initial: (direction) => ({ x: direction > 0 ? "20%" : "-20%", opacity: 0 }),
    animate: { x: 0, opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
    exit: (direction) => ({ x: direction > 0 ? "-20%" : "20%", opacity: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }),
  };

  const rawTagline = brand?.tagline || "U VAPE | PREMIUM DISPOSABLES & E-LIQUIDS";
  const displayTagline = rawTagline
    .replace(/pairo\s*store\s*[-–—]\s*raw\s*luxury\s*outerwear/gi, "U VAPE STORE — PREMIUM VAPES & E-LIQUIDS")
    .replace(/pairo\s*store/gi, "U VAPE STORE")
    .replace(/pairo/gi, "U VAPE")
    .replace(/raw luxury outerwear/gi, "PREMIUM VAPES & E-LIQUIDS")
    .replace(/outerwear/gi, "E-LIQUIDS")
    .replace(/shearling/gi, "DISPOSABLES")
    .replace(/jackets?/gi, "VAPES")
    .replace(/leather/gi, "VAPE GEAR");

  const currentSlideObj = hero.slides[currentSlide] || {};
  const displaySlideTitle = (currentSlideObj.title || "PREMIUM DISPOSABLE VAPES")
    .replace(/pairo/gi, "U VAPE")
    .replace(/shearling/gi, "DISPOSABLE")
    .replace(/outerwear/gi, "E-LIQUID")
    .replace(/jackets?/gi, "VAPES");

  const displaySlideSubtitle = (currentSlideObj.subtitle || "Explore top-rated disposable vapes and authentic salt nics engineered for maximum flavor.")
    .replace(/pairo/gi, "U Vape")
    .replace(/shearling/gi, "disposable vape")
    .replace(/outerwear/gi, "e-liquids")
    .replace(/jackets?/gi, "vapes");

  return (
    <section className="container mx-auto px-2 sm:px-4 md:px-8 my-4 md:my-6">
      <div className="relative h-[560px] md:h-[660px] lg:h-[760px] rounded-[32px] md:rounded-[44px] shadow-2xl overflow-hidden bg-neutral-950 border border-neutral-800/80 [transform:translateZ(0)]">
        <div className="relative h-[calc(100%-48px)] md:h-[calc(100%-56px)] overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div key={currentSlide} custom={direction} variants={slideVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 bg-neutral-950">
              <div className="absolute inset-0">
                {currentSlideObj.mobileImage ? (
                  <>
                    <div className="block md:hidden absolute inset-0">
                      <Image src={currentSlideObj.mobileImage} alt={displaySlideTitle} fill className="object-cover object-center brightness-[0.85] contrast-[1.05]" priority />
                    </div>
                    <div className="hidden md:block absolute inset-0">
                      <Image src={currentSlideObj.image} alt={displaySlideTitle} fill className="object-cover object-right md:object-center brightness-[0.85] contrast-[1.05]" priority />
                    </div>
                  </>
                ) : (
                  <Image src={currentSlideObj.image} alt={displaySlideTitle} fill className="object-cover object-right md:object-center brightness-[0.85] contrast-[1.05]" priority />
                )}
              </div>
              
              {/* Premium Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-black/30 md:from-black/90 md:via-black/40 md:to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

              <div className="container mx-auto px-6 md:px-16 h-full flex items-center relative z-10">
                <div className="max-w-2xl">
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }} className="space-y-4 md:space-y-6">
                    
                    {/* Tagline & 21+ Compliance Tag */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        21+ Adult Vape Store
                      </span>
                      <div className="hidden sm:block h-[1.5px] w-6 bg-white/30" />
                      <span className="text-white/80 text-[10px] md:text-xs font-bold tracking-[0.25em] uppercase">{displayTagline}</span>
                    </div>

                    {/* Main Hero Headline */}
                    {React.createElement(
                      headingLevel,
                      { className: "text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white heading-font leading-[1.04] tracking-tight max-w-[15ch] md:max-w-none uppercase drop-shadow-md" },
                      displaySlideTitle
                    )}

                    {/* Subtitle */}
                    <p className="text-white/85 text-xs md:text-base lg:text-lg max-w-lg leading-relaxed font-sans font-normal">
                      {displaySlideSubtitle}
                    </p>

                    {/* Vape Spec Chips */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="bg-white/10 backdrop-blur-md text-white text-[9px] md:text-[10px] font-bold px-3 py-1 rounded-full border border-white/15">
                        ⚡ UP TO 15,000 PUFFS
                      </span>
                      <span className="bg-white/10 backdrop-blur-md text-white text-[9px] md:text-[10px] font-bold px-3 py-1 rounded-full border border-white/15">
                        🔋 TYPE-C RECHARGEABLE
                      </span>
                      <span className="bg-emerald-500/20 backdrop-blur-md text-emerald-300 text-[9px] md:text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-400/30">
                        💧 5% SALT NICOTINE
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4 pt-3 md:pt-4">
                      {hero.slides[currentSlide].link ? (
                        <Link
                          href={hero.slides[currentSlide].link}
                          className="group flex items-center justify-center gap-3 bg-white text-black px-7 sm:px-9 md:px-10 py-3.5 md:py-4 rounded-full font-bold text-[11px] sm:text-xs md:text-sm tracking-widest uppercase transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.03] active:scale-95 shadow-2xl relative z-20"
                        >
                          <span>{hero.slides[currentSlide].buttonText || "SHOP NOW"}</span>
                          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                      ) : (
                        <Link
                          href="/shop"
                          className="group flex items-center justify-center gap-3 bg-white text-black px-7 sm:px-9 md:px-10 py-3.5 md:py-4 rounded-full font-bold text-[11px] sm:text-xs md:text-sm tracking-widest uppercase transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.03] active:scale-95 shadow-2xl relative z-20"
                        >
                          <span>{hero.slides[currentSlide].buttonText || "EXPLORE CATALOG"}</span>
                          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="absolute bottom-16 right-6 sm:bottom-16 sm:right-10 md:bottom-20 md:right-16 flex items-center gap-4 md:gap-8 z-30">
            <div className="hidden md:flex items-center gap-3 text-white font-bold heading-font">
              <span className="text-xl text-white">0{currentSlide + 1}</span>
              <div className="w-8 h-[1px] bg-white/30" />
              <span className="text-white/40 text-sm">0{hero.slides.length}</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={prevSlide} 
                aria-label="Previous Slide"
                className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-300 bg-black/40 backdrop-blur-md active:scale-90"
              >
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button 
                onClick={nextSlide} 
                aria-label="Next Slide"
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white text-black flex items-center justify-center shadow-xl hover:bg-neutral-200 transition-all duration-300 active:scale-90"
              >
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>

        <MarqueeSection items={hero.marqueeItems} />
      </div>
    </section>
  );
}