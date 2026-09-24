"use client";

import React, { useState, useRef, useEffect } from "react";
import { Columns3, Check } from "lucide-react";
import { BULK_COLUMNS } from "@/lib/bulkProductUtils";

export default function ColumnSelector({ visibleColumns, setVisibleColumns }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleColumn = (key) => {
    // Keep name always visible
    if (key === "name") return;
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const showAll = () => {
    setVisibleColumns(BULK_COLUMNS.map((c) => c.key));
  };

  const resetDefault = () => {
    setVisibleColumns(["name", "sku", "price", "compareAtPrice", "stock", "category", "status"]);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#2c3338] bg-white border border-[#ccd0d4] rounded-[3px] shadow-sm hover:bg-[#f6f7f7] cursor-pointer"
      >
        <Columns3 className="w-3.5 h-3.5 text-[#646970]" />
        <span>Columns ({visibleColumns.length})</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-white border border-[#ccd0d4] rounded-[4px] shadow-xl z-50 p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-100 font-sans">
          <div className="flex items-center justify-between pb-2 border-b border-[#f0f0f1]">
            <span className="text-[12px] font-bold text-[#1d2327]">Toggle Columns</span>
            <div className="flex items-center gap-2 text-[11px] text-[#2271b1]">
              <button type="button" onClick={showAll} className="hover:underline cursor-pointer">
                All
              </button>
              <span>·</span>
              <button type="button" onClick={resetDefault} className="hover:underline cursor-pointer">
                Default
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1">
            {BULK_COLUMNS.map((col) => {
              const isChecked = visibleColumns.includes(col.key);
              const isLocked = col.key === "name";

              return (
                <label
                  key={col.key}
                  className={`flex items-center justify-between px-2 py-1 rounded text-[12px] cursor-pointer hover:bg-[#f0f6fb] ${
                    isLocked ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isLocked}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded border-[#8c8f94] text-[#2271b1] focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[#2c3338]">{col.label}</span>
                  </div>
                  {isChecked && <Check className="w-3.5 h-3.5 text-[#2271b1]" />}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
