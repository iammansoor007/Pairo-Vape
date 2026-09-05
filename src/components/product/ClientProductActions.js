"use client";

import { useState, useEffect } from "react";
import { Plus, Minus, Check } from "lucide-react";

import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";

export default function ClientProductActions({ product, onVariantChange }) {
  const [selectedOptions, setSelectedOptions] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const { addToCart } = useCart();
  const router = useRouter();

  const attributes =
    product.attributes ||
    product.variants?.map((v) => ({
      name: v.name,
      type: v.name.toLowerCase().includes("color") || v.name.toLowerCase().includes("flavor") ? "color" : "custom",
      values: v.values.map((val) => ({
        label: val.name || val,
        value: val.name || val,
        hex: val.hex || "",
        colorMode: val.colorMode || "single",
        hex2: val.hex2 || "",
        hex3: val.hex3 || "",
        hex4: val.hex4 || "",
        texture: val.texture || "",
        image: val.image || "",
        swatchType: val.swatchType || "color",
        variantImage: val.variantImage || "",
      })),
    })) ||
    [];

  const handleOptionSelect = (attrName, option) => {
    const newOptions = { ...selectedOptions, [attrName]: option.label };
    setSelectedOptions(newOptions);

    const attr = attributes.find((a) => a.name === attrName);
    const isColor =
      attr?.type === "color" || attrName.toLowerCase().includes("color") || attrName.toLowerCase().includes("flavor");

    if (isColor && onVariantChange) {
      onVariantChange({ image: option.variantImage || "", isPartial: true });
    } else if (option.variantImage && onVariantChange) {
      onVariantChange({ image: option.variantImage, isPartial: true });
    }

    if (product.variantCombinations?.length) {
      const attrOrder = product.attributes?.map(a => newOptions[a.name]).filter(Boolean) || [];
      const selectedStr = attrOrder.join(" / ");
      const match = product.variantCombinations.find(
        (v) => v.title === selectedStr || Object.values(newOptions).join(" / ") === v.title
      );
      if (match && onVariantChange) onVariantChange(match);
    }
  };

  const handleAddToCart = (openDrawer = true) => {
    if (product.productType === "variable") {
      const missingAttrs = attributes.filter(attr => !selectedOptions[attr.name]);
      if (missingAttrs.length > 0) {
        alert(`Please select: ${missingAttrs.map(a => a.name).join(", ")}`);
        return;
      }
    }

    let price = product.price;
    let compareAtPrice = product.compareAtPrice;
    let image = product.images?.[0] || product.image;
    let sku = product.sku;

    if (product.variantCombinations?.length && Object.keys(selectedOptions).length > 0) {
      const attrOrder = product.attributes?.map(a => selectedOptions[a.name]).filter(Boolean) || [];
      const selectedStr = attrOrder.join(" / ");
      const match = product.variantCombinations.find(
        (v) => v.title === selectedStr || Object.values(selectedOptions).join(" / ") === v.title
      );
      if (match) {
        if (match.price !== undefined && match.price !== null) price = match.price;
        if (match.compareAtPrice !== undefined && match.compareAtPrice !== null) compareAtPrice = match.compareAtPrice;
        if (match.image) image = match.image;
        if (match.sku) sku = match.sku;
      }
    }

    for (let i = 0; i < quantity; i++) {
      addToCart({
        ...product,
        price,
        compareAtPrice,
        image,
        sku,
        selectedOptions
      }, openDrawer);
    }
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1800);
  };

  const handleSecureCheckout = () => {
    if (product.productType === "variable") {
      const missingAttrs = attributes.filter(attr => !selectedOptions[attr.name]);
      if (missingAttrs.length > 0) {
        alert(`Please select: ${missingAttrs.map(a => a.name).join(", ")}`);
        return;
      }
    }
    handleAddToCart(false);
    router.push("/checkout");
  };

  return (
    <div className="space-y-4">
      {product.productType === "variable" && attributes.map((attr) => {
        const isColor =
          attr.type === "color" || attr.name.toLowerCase().includes("color") || attr.name.toLowerCase().includes("flavor");

        return (
          <div key={attr.name} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] md:text-[12px] font-bold text-black uppercase tracking-[0.25em]">
                  {attr.name}
                </p>
                {selectedOptions[attr.name] && (
                  <span className="text-[12px] md:text-[13px] font-bold text-black uppercase tracking-wider">
                    — {selectedOptions[attr.name]}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(attr.values || []).map((option) => {
                const isSelected = selectedOptions[attr.name] === option.label;

                if (isColor && option.hex) {
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => handleOptionSelect(attr.name, option)}
                      title={option.label}
                      className={`relative w-9 h-9 md:w-10 md:h-10 rounded-full transition-all duration-200 flex items-center justify-center ${isSelected
                        ? "ring-1 ring-offset-2 ring-black scale-105"
                        : "ring-1 ring-black/10 hover:ring-black/30 hover:scale-105"
                        }`}
                      style={{
                        backgroundColor: option.hex || "#ddd",
                        backgroundImage: option.image
                          ? `url(${option.image})`
                          : "none",
                        backgroundSize: "cover",
                      }}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/10">
                          <Check
                            className={`w-3 h-3 ${option.hex === "#FFFFFF" ||
                              option.hex === "#ffffff"
                              ? "text-black"
                              : "text-white"
                              }`}
                            strokeWidth={3}
                          />
                        </div>
                      )}
                    </button>
                  );
                }

                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleOptionSelect(attr.name, option)}
                    className={`h-10 px-4 rounded-[var(--radius,0px)] text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-200 border ${isSelected
                      ? "bg-black text-white border-black"
                      : "bg-transparent text-black border-black/30 hover:border-black"
                      }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {product.productType === "variable" && attributes.length > 0 && (
        <hr className="border-t border-black/10" />
      )}

      <div className="space-y-2.5 pt-1">
        <div className="flex gap-2 items-stretch">
          <div className="flex items-center justify-center bg-transparent rounded-[var(--radius,0px)] border border-black/30 gap-2 h-11 min-w-[100px] shrink-0">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="text-black hover:text-black/70 transition-colors p-1"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold text-[14px] w-6 text-center text-black select-none">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="text-black hover:text-black/70 transition-colors p-1"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
             onClick={() => handleAddToCart(true)}
             className="flex-1 h-11 rounded-[var(--radius,0px)] font-bold uppercase tracking-[0.2em] text-[11px] flex items-center justify-center transition-all duration-300 active:scale-[0.98] border bg-black text-white border-black hover:bg-black/90"
           >
            {addedFeedback ? "Added!" : "Add to Cart"}
          </button>

          <button
            onClick={handleSecureCheckout}
            className="flex-1 h-11 rounded-[var(--radius,0px)] border border-black/30 text-black font-bold uppercase tracking-[0.2em] text-[11px] hover:bg-black hover:text-white hover:border-black transition-all duration-200 active:scale-[0.98] flex items-center justify-center"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}