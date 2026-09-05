"use client";

import * as LucideIcons from "lucide-react";
import { ArrowUpRight, Zap } from "lucide-react";

const MarqueeItem = ({ item }) => (
  <div className="flex items-center gap-3 md:gap-8 px-5 md:px-12 group cursor-pointer">
    {/* Texture Circle Accent */}
    <div className="w-7 h-7 md:w-11 md:h-11 rounded-full bg-[var(--secondary)] border border-[var(--border)] overflow-hidden flex-shrink-0 relative shadow-sm">
      <div className="absolute inset-0 bg-black/5 mix-blend-overlay" />
      <item.icon className="w-3.5 h-3.5 md:w-5 md:h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black/60 group-hover:text-black transition-colors duration-500" />
    </div>

    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 md:gap-2">
        <span className="text-sm md:text-2xl font-bold uppercase tracking-tighter heading-font text-black/90 group-hover:text-black transition-all duration-500 whitespace-nowrap">
          {item.text}
        </span>
        <ArrowUpRight className="w-3 h-3 md:w-5 md:h-5 text-black/20 group-hover:text-black group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-500" />
      </div>
      <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.25em] text-black/50 group-hover:text-black/70 transition-colors duration-500">
        {item.subText || "U VAPE — PRO"}
      </span>
    </div>

    {/* Beautiful Vertical Divider */}
    <div className="relative flex items-center justify-center ml-5 md:ml-12 h-8 md:h-12 w-4 md:w-6">
      <div className="h-full w-[1px] bg-black/[0.08]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full border border-black/10 bg-white shadow-sm" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-black/20" />
    </div>
  </div>
);

export default function FeatureMarquee({
  items: propItems,
  speed: propSpeed
}) {
  const defaultFeatures = [
    { text: "21+ Verified Store", subText: "AUTHENTIC VAPES" },
    { text: "Express Delivery", subText: "SAME-DAY DISPATCH" },
    { text: "100% Original Brands", subText: "OFFICIAL DISTRIBUTOR" },
    { text: "Flavor Guarantee", subText: "TOP-RATED E-LIQUIDS" },
    { text: "Discrete Shipping", subText: "PRIVACY ASSURED" },
    { text: "24/7 Vapers Support", subText: "EXPERT ASSISTANCE" },
  ];

  const features = (propItems || defaultFeatures).map(item => ({
    ...item,
    icon: LucideIcons[item.icon] || Zap
  }));

  const speed = propSpeed || 80;

  return (
    <section className="py-4 md:py-8 bg-[var(--background)] overflow-hidden border-y border-[var(--border)]">
      <div className="marquee-container flex whitespace-nowrap">
        <div className="marquee-content flex shrink-0 items-center animate-scroll-left hover:pause">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center">
              {features.map((feature, idx) => (
                <MarqueeItem key={idx} item={feature} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .animate-scroll-left {
          animation: scroll-left ${speed}s linear infinite;
        }
        .hover\\:pause:hover {
          animation-play-state: paused;
        }
        @keyframes scroll-left {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}} />
    </section>
  );
}
