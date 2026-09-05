"use client";

import Link from "next/link";
import { ShoppingBag, Eye, Star, Check } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { getProductUrl } from "@/lib/routes";

export default function ProductCard({ product }) {
  const [isHovered, setIsHovered] = useState(false);
  const [added, setAdded] = useState(false);
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

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    e.preventDefault();
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  // Calculate discount percentage if old price exists
  const originalPrice = parseFloat(product.compareAtPrice || product.oldPrice || 0);
  const currentPrice = parseFloat(product.price || 0);
  const discountPercent = originalPrice > currentPrice 
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) 
    : 0;

  return (
    <div
      className="group cursor-pointer w-full flex flex-col h-full relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Container — Glassmorphic Frame with Glowing Accent */}
      <div 
        className="relative w-full bg-neutral-900/5 rounded-[22px] md:rounded-[30px] overflow-hidden border border-neutral-200/80 dark:border-neutral-800 shadow-sm transition-all duration-500 group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] group-hover:border-neutral-900 dark:group-hover:border-white/30" 
        style={{ paddingBottom: '108%' }}
      >
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
              transform: isHovered ? 'scale(1.08)' : 'scale(1)',
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
                transform: isHovered ? 'scale(1)' : 'scale(1.08)',
                transition: 'opacity 0.5s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          )}

          {/* Top Pill Badges (21+ Vape / Nic Strength / Discount) */}
          <div className="absolute top-2.5 left-2.5 md:top-3.5 md:left-3.5 z-10 flex flex-wrap gap-1.5 pointer-events-none">
            <span className="bg-black/90 backdrop-blur-md text-white text-[8px] md:text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md border border-white/10">
              21+ VAPE
            </span>
            {product.nicotine ? (
              <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[8px] md:text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                {product.nicotine}
              </span>
            ) : (
              <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[8px] md:text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                5% NIC SALT
              </span>
            )}
            {discountPercent > 0 && (
              <span className="bg-rose-600/90 backdrop-blur-md text-white text-[8px] md:text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                -{discountPercent}%
              </span>
            )}
          </div>
        </Link>

        {/* Hover Action Bar */}
        <div className="absolute bottom-2.5 md:bottom-3.5 left-2.5 md:left-3.5 right-2.5 md:right-3.5 flex gap-2 z-20 pointer-events-none group-hover:pointer-events-auto">
          <button
            onClick={handleQuickAdd}
            className={`group/btn relative flex-[3] h-10 md:h-11 rounded-xl font-bold text-[9px] md:text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out active:scale-95 ${
              added ? "bg-emerald-600 text-white" : "bg-black text-white hover:bg-neutral-800"
            }`}
          >
            {added ? (
              <>
                <Check className="w-4 h-4 animate-bounce" />
                Added to Bag
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Add to Bag
              </>
            )}
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
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-black/40">
              {product.category || "DISPOSABLE VAPE"}
            </span>
            
            {/* Flavor Note Accent Dots */}
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 border border-black/10 shadow-sm" title="Menthol / Ice" />
              <span className="w-2 h-2 rounded-full bg-rose-400 border border-black/10 shadow-sm" title="Fruity" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 border border-black/10 shadow-sm" title="Fresh" />
            </div>
          </div>

          <h3
            style={{ fontFamily: "var(--brand-font)" }}
            className="text-[13px] md:text-[15px] font-extrabold uppercase tracking-wide text-foreground group-hover:text-black transition-colors line-clamp-1"
          >
            {product.name}
          </h3>
        </div>

        <div className="flex items-center justify-between border-t border-black/10 pt-2.5 md:pt-3 mt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-base md:text-xl font-black tracking-tight text-foreground">${product.price}</span>
            {originalPrice > currentPrice && (
              <span className="text-[10px] md:text-xs font-semibold text-foreground/40 line-through">
                ${originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            <span className="text-[10px] md:text-[11px] font-extrabold text-amber-900 dark:text-amber-300">
              {(product.rating || 4.9).toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
