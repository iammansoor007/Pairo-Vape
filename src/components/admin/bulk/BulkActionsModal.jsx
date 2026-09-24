"use client";

import React, { useState } from "react";
import { X, DollarSign, Folder, CheckCircle, Package, Star } from "lucide-react";

export default function BulkActionsModal({
  isOpen,
  onClose,
  selectedCount,
  categories = [],
  onApply,
}) {
  const [activeTab, setActiveTab] = useState("price");

  // Price state
  const [priceMode, setPriceMode] = useState("set"); // 'set', 'inc_amount', 'dec_amount', 'inc_percent', 'dec_percent'
  const [priceValue, setPriceValue] = useState("");

  // Category state
  const [selectedCategory, setSelectedCategory] = useState("");

  // Status state
  const [selectedStatus, setSelectedStatus] = useState("Published");

  // Stock state
  const [stockMode, setStockMode] = useState("set"); // 'set', 'inc', 'dec'
  const [stockValue, setStockValue] = useState("");

  // Featured state
  const [featuredValue, setFeaturedValue] = useState(true);

  if (!isOpen) return null;

  const handleApply = () => {
    if (activeTab === "price") {
      const val = parseFloat(priceValue);
      if (isNaN(val) || val < 0) {
        alert("Please enter a valid numeric value");
        return;
      }
      onApply({ type: "price", mode: priceMode, value: val });
    } else if (activeTab === "category") {
      if (selectedCategory === "") {
        alert("Please select a category or choose 'Remove Category'");
        return;
      }
      onApply({ type: "category", value: selectedCategory === "__NONE__" ? "" : selectedCategory });
    } else if (activeTab === "status") {
      onApply({ type: "status", value: selectedStatus });
    } else if (activeTab === "stock") {
      const val = parseInt(stockValue, 10);
      if (isNaN(val) || val < 0) {
        alert("Please enter a valid whole number for stock");
        return;
      }
      onApply({ type: "stock", mode: stockMode, value: val });
    } else if (activeTab === "featured") {
      onApply({ type: "featured", value: featuredValue });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-sans backdrop-blur-xs">
      <div className="bg-white rounded-[6px] shadow-2xl w-full max-w-lg overflow-hidden border border-[#ccd0d4] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#ccd0d4] bg-[#f6f7f7]">
          <div>
            <h2 className="text-[16px] font-bold text-[#1d2327]">Bulk Edit Selected Rows</h2>
            <p className="text-[12px] text-[#646970]">
              Applying changes to <span className="font-semibold text-[#2271b1]">{selectedCount}</span> selected products
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#646970] hover:text-[#1d2327] p-1 rounded hover:bg-[#eaeaea] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#ccd0d4] bg-[#fafafa] text-[13px] font-medium text-[#646970]">
          <button
            type="button"
            onClick={() => setActiveTab("price")}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === "price"
                ? "border-[#2271b1] text-[#2271b1] bg-white font-semibold"
                : "border-transparent hover:text-[#1d2327]"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Price
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("category")}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === "category"
                ? "border-[#2271b1] text-[#2271b1] bg-white font-semibold"
                : "border-transparent hover:text-[#1d2327]"
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            Category
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("status")}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === "status"
                ? "border-[#2271b1] text-[#2271b1] bg-white font-semibold"
                : "border-transparent hover:text-[#1d2327]"
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Status
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stock")}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === "stock"
                ? "border-[#2271b1] text-[#2271b1] bg-white font-semibold"
                : "border-transparent hover:text-[#1d2327]"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Stock
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("featured")}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === "featured"
                ? "border-[#2271b1] text-[#2271b1] bg-white font-semibold"
                : "border-transparent hover:text-[#1d2327]"
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            Featured
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 space-y-4 text-[13px]">
          
          {/* PRICE TAB */}
          {activeTab === "price" && (
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#1d2327] mb-1.5">Adjustment Type</label>
                <div className="grid grid-cols-1 gap-2">
                  <label className="flex items-center gap-2 p-2 border rounded border-[#ccd0d4] hover:bg-[#f6f7f7] cursor-pointer">
                    <input
                      type="radio"
                      name="priceMode"
                      value="set"
                      checked={priceMode === "set"}
                      onChange={() => setPriceMode("set")}
                      className="text-[#2271b1]"
                    />
                    <span>Set price to exact amount</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded border-[#ccd0d4] hover:bg-[#f6f7f7] cursor-pointer">
                    <input
                      type="radio"
                      name="priceMode"
                      value="inc_amount"
                      checked={priceMode === "inc_amount"}
                      onChange={() => setPriceMode("inc_amount")}
                      className="text-[#2271b1]"
                    />
                    <span>Increase price by fixed amount ($)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded border-[#ccd0d4] hover:bg-[#f6f7f7] cursor-pointer">
                    <input
                      type="radio"
                      name="priceMode"
                      value="dec_amount"
                      checked={priceMode === "dec_amount"}
                      onChange={() => setPriceMode("dec_amount")}
                      className="text-[#2271b1]"
                    />
                    <span>Decrease price by fixed amount ($)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded border-[#ccd0d4] hover:bg-[#f6f7f7] cursor-pointer">
                    <input
                      type="radio"
                      name="priceMode"
                      value="inc_percent"
                      checked={priceMode === "inc_percent"}
                      onChange={() => setPriceMode("inc_percent")}
                      className="text-[#2271b1]"
                    />
                    <span>Increase price by percentage (%)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded border-[#ccd0d4] hover:bg-[#f6f7f7] cursor-pointer">
                    <input
                      type="radio"
                      name="priceMode"
                      value="dec_percent"
                      checked={priceMode === "dec_percent"}
                      onChange={() => setPriceMode("dec_percent")}
                      className="text-[#2271b1]"
                    />
                    <span>Decrease price by percentage (%)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#1d2327] mb-1">
                  {priceMode.includes("percent") ? "Percentage Value (%)" : "Amount Value ($)"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[#646970]">
                    {priceMode.includes("percent") ? "%" : "$"}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={priceValue}
                    onChange={(e) => setPriceValue(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-[#8c8f94] rounded-[3px] focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CATEGORY TAB */}
          {activeTab === "category" && (
            <div className="space-y-3">
              <label className="block text-[12px] font-bold text-[#1d2327]">Select New Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-[#8c8f94] rounded-[3px] bg-white outline-none focus:border-[#2271b1]"
              >
                <option value="">-- Choose Category --</option>
                <option value="__NONE__">-- Remove Category (None) --</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <p className="text-[12px] text-[#646970]">
                All {selectedCount} selected products will be updated with this category.
              </p>
            </div>
          )}

          {/* STATUS TAB */}
          {activeTab === "status" && (
            <div className="space-y-3">
              <label className="block text-[12px] font-bold text-[#1d2327]">Select Status</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStatus("Published")}
                  className={`p-3 border rounded text-center cursor-pointer transition-all ${
                    selectedStatus === "Published"
                      ? "border-[#2271b1] bg-[#f0f6fb] text-[#2271b1] font-bold shadow-xs"
                      : "border-[#ccd0d4] hover:bg-[#f6f7f7]"
                  }`}
                >
                  Published (Live)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus("Draft")}
                  className={`p-3 border rounded text-center cursor-pointer transition-all ${
                    selectedStatus === "Draft"
                      ? "border-[#2271b1] bg-[#f0f6fb] text-[#2271b1] font-bold shadow-xs"
                      : "border-[#ccd0d4] hover:bg-[#f6f7f7]"
                  }`}
                >
                  Draft (Hidden)
                </button>
              </div>
            </div>
          )}

          {/* STOCK TAB */}
          {activeTab === "stock" && (
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#1d2327] mb-1.5">Stock Adjustment</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStockMode("set")}
                    className={`py-2 px-1 text-center border rounded text-[12px] cursor-pointer ${
                      stockMode === "set" ? "border-[#2271b1] bg-[#f0f6fb] text-[#2271b1] font-bold" : "border-[#ccd0d4]"
                    }`}
                  >
                    Set Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockMode("inc")}
                    className={`py-2 px-1 text-center border rounded text-[12px] cursor-pointer ${
                      stockMode === "inc" ? "border-[#2271b1] bg-[#f0f6fb] text-[#2271b1] font-bold" : "border-[#ccd0d4]"
                    }`}
                  >
                    Add (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockMode("dec")}
                    className={`py-2 px-1 text-center border rounded text-[12px] cursor-pointer ${
                      stockMode === "dec" ? "border-[#2271b1] bg-[#f0f6fb] text-[#2271b1] font-bold" : "border-[#ccd0d4]"
                    }`}
                  >
                    Subtract (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#1d2327] mb-1">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={stockValue}
                  onChange={(e) => setStockValue(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#8c8f94] rounded-[3px] focus:border-[#2271b1] outline-none"
                />
              </div>
            </div>
          )}

          {/* FEATURED TAB */}
          {activeTab === "featured" && (
            <div className="space-y-3">
              <label className="block text-[12px] font-bold text-[#1d2327]">Featured Product Status</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFeaturedValue(true)}
                  className={`p-3 border rounded text-center cursor-pointer transition-all ${
                    featuredValue === true
                      ? "border-[#2271b1] bg-[#f0f6fb] text-[#2271b1] font-bold shadow-xs"
                      : "border-[#ccd0d4] hover:bg-[#f6f7f7]"
                  }`}
                >
                  Featured ★
                </button>
                <button
                  type="button"
                  onClick={() => setFeaturedValue(false)}
                  className={`p-3 border rounded text-center cursor-pointer transition-all ${
                    featuredValue === false
                      ? "border-[#2271b1] bg-[#f0f6fb] text-[#2271b1] font-bold shadow-xs"
                      : "border-[#ccd0d4] hover:bg-[#f6f7f7]"
                  }`}
                >
                  Not Featured
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#ccd0d4] bg-[#f6f7f7]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-[13px] text-[#2c3338] bg-white border border-[#ccd0d4] rounded-[3px] hover:bg-[#f0f0f1] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 text-[13px] font-bold text-white bg-[#2271b1] hover:bg-[#135e96] rounded-[3px] shadow-sm cursor-pointer"
          >
            Apply to {selectedCount} Products
          </button>
        </div>

      </div>
    </div>
  );
}
