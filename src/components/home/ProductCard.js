"use client";

import Link from "next/link";
import { ShoppingBag, Eye, Star } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { getProductUrl } from "@/lib/routes";

export default function ProductCard({ product }) {
  const [isHovered, setIsHovered] = useState(false);
  const { addToCart } = useCart();

  const getAbsoluteUrl = (url) => {
    if (!url) return "/placeholder.jpg";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    return url.startsWith("/") ? url : `/${url}`;
  };

  const mainImage = getAbsoluteUrl(product.images?.[0] || product.image);
  const hoverImage = product.images?.[1] || product.image2 ? getAbsoluteUrl(product.images?.[1] || product.image2) : null;

  return (
    <div
      className="group cursor-pointer w-full flex flex-col h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Container — padding-bottom hack ensures consistent ratio */}
      <div className="relative w-full bg-neutral-900/5 rounded-[20px] md:rounded-[28px] overflow-hidden border border-black/5 dark:border-white/10 shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:border-black/20" style={{ paddingBottom: '105%' }}>
        <Link href={getProductUrl(product)} className="absolute inset-0 block">

          {/* Main Image */}
          <img
            src={mainImage}
            alt={product.imageAlts?.[mainImage] || product.name || "Vape Product"}
            loading="eager"
            decoding="async"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: isHovered && hoverImage ? 0 : 1,
              transform: isHovered ? 'scale(1.06)' : 'scale(1)',
              transition: 'opacity 0.5s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />

          {/* Hover Image */}
          {hoverImage && (
            <img
              src={hoverImage}
              alt={product.imageAlts?.[hoverImage] || product.name || "Vape Product"}
              loading="lazy"
              decoding="async"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: isHovered ? 1 : 0,
                transform: isHovered ? 'scale(1)' : 'scale(1.06)',
                transition: 'opacity 0.5s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          )}

          {/* Top Badges (21+ / Sale / Category) */}
          <div className="absolute top-2.5 left-2.5 md:top-3.5 md:left-3.5 z-10 flex flex-wrap gap-1.5 pointer-events-none">
            <span className="bg-black/90 backdrop-blur-md text-white text-[8px] md:text-[9.5px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
              21+ VAPE
            </span>
            {product.nicotine && (
              <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[8px] md:text-[9.5px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                {product.nicotine}
              </span>
            )}
            {(product.compareAtPrice || product.oldPrice) && (
              <span className="bg-rose-600/90 backdrop-blur-md text-white text-[8px] md:text-[9.5px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                SALE
              </span>
            )}
          </div>
        </Link>

        {/* Hover Actions Bar */}
        <div className="absolute bottom-2.5 md:bottom-3.5 left-2.5 md:left-3.5 right-2.5 md:right-3.5 flex gap-2 z-20 pointer-events-none group-hover:pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product);
            }}
            className="group/btn relative flex-[3] bg-black text-white h-10 md:h-11 rounded-xl font-bold text-[9px] md:text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out active:scale-95 hover:bg-neutral-800"
          >
            <ShoppingBag className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Add to Bag
          </button>

          <Link href={getProductUrl(product)} className="flex-1">
            <button 
              aria-label="Quick View"
              className="group/view w-full bg-white/95 backdrop-blur-md text-black h-10 md:h-11 rounded-xl flex items-center justify-center shadow-2xl translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75 ease-out border border-black/10 active:scale-95 hover:bg-neutral-100"
            >
              <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </Link>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-3 md:mt-4 space-y-1.5 px-1 flex-1 flex flex-col justify-between">
        <div>
          {product.category && (
            <p className="text-[9px] md:text-[10.5px] font-bold uppercase tracking-widest text-black/40 mb-0.5">
              {product.category}
            </p>
          )}
          <h3
            style={{ fontFamily: "var(--brand-font)" }}
            className="text-[12px] md:text-[14px] font-bold uppercase tracking-wide text-foreground group-hover:text-black transition-colors line-clamp-1"
          >
            {product.name}
          </h3>
        </div>

        <div className="flex items-center justify-between border-t border-black/5 pt-2.5 md:pt-3 mt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm md:text-lg font-black tracking-tight text-foreground">${product.price}</span>
            {(product.compareAtPrice || product.oldPrice) && (
              <span className="text-[10px] md:text-xs font-semibold text-foreground/40 line-through">
                ${product.compareAtPrice || product.oldPrice}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            <span className="text-[10px] md:text-[11px] font-bold text-amber-900/90 dark:text-amber-300">
              {(product.rating || 4.9).toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
