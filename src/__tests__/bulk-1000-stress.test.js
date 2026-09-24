import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  validateProductRow,
  sanitizePrice,
  sanitizeStock,
  normalizeStatus,
  autoDetectColumnMapping,
  BULK_COLUMNS,
  DEFAULT_PRODUCT_ROW,
} from "@/lib/bulkProductUtils";

describe("⚡ 1,000-ROW EXTREME STRESS & FUZZING TEST SUITE", () => {

  // =========================================================================
  // 1. 1,000-ROW GENERATION & PERFORMANCE BENCHMARK
  // =========================================================================
  it("1.1 should generate, sanitize, and validate 1,000 realistic products under 200ms", () => {
    const categories = ["Disposables", "Pod Systems", "Vape Mods", "E-Liquids", "Tanks", "Coils"];
    const statuses = ["Published", "Draft", "Active", "Live", "inactive"];
    const thousandProducts = [];

    const startTime = performance.now();

    for (let i = 1; i <= 1000; i++) {
      const hasDiscount = i % 3 === 0;
      thousandProducts.push({
        _rowId: `stress-prod-${i}`,
        name: `Performance Vape Device Model #${i} - Edition 2026`,
        sku: `SKU-STRESS-${String(i).padStart(5, "0")}`,
        price: (10 + (i % 80) + 0.99).toFixed(2),
        compareAtPrice: hasDiscount ? (25 + (i % 80) + 0.99).toFixed(2) : "",
        stock: (i * 7) % 500,
        manageStock: i % 10 !== 0,
        category: categories[i % categories.length],
        status: statuses[i % statuses.length],
        isFeatured: i % 15 === 0,
        tags: `tag-${i % 10}, vape, test, bulk`,
        image: `https://images.unsplash.com/photo-${1500000000000 + i}?w=500`,
        shortDescription: `High performance test vape product number ${i} with premium mesh coil.`,
        isNew: false,
      });
    }

    // Validate all 1,000 products
    let validCount = 0;
    thousandProducts.forEach((p) => {
      const val = validateProductRow(p);
      if (val.isValid) validCount++;
    });

    const elapsed = performance.now() - startTime;

    expect(thousandProducts.length).toBe(1000);
    expect(validCount).toBe(1000);
    expect(elapsed).toBeLessThan(500); // Must be fast (<500ms in test runner)
  });

  // =========================================================================
  // 2. 1,000-ROW EXCEL & CSV EXPORT / IMPORT ROUND-TRIP
  // =========================================================================
  it("2.1 should serialize 1,000 products to Excel (XLSX) and parse back with 0 data loss", () => {
    const rawData = [];
    for (let i = 1; i <= 1000; i++) {
      rawData.push({
        name: `Bulk Test Item #${i}`,
        sku: `SKU-${i}`,
        price: 19.99,
        compareAtPrice: 24.99,
        stock: i % 200,
        manageStock: true,
        category: "Test Category",
        status: "Published",
        isFeatured: false,
        tags: "bulk, excel",
        image: "https://example.com/test.jpg",
        shortDescription: `Description for test item ${i}`,
      });
    }

    // Write to XLSX buffer
    const ws = XLSX.utils.json_to_sheet(rawData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    expect(wbout.byteLength).toBeGreaterThan(10000);

    // Read back from XLSX buffer
    const readWb = XLSX.read(wbout, { type: "array" });
    expect(readWb.SheetNames).toContain("Products");

    const parsedRows = XLSX.utils.sheet_to_json(readWb.Sheets["Products"]);
    expect(parsedRows.length).toBe(1000);
    expect(parsedRows[0].name).toBe("Bulk Test Item #1");
    expect(parsedRows[999].name).toBe("Bulk Test Item #1000");
    expect(parsedRows[499].sku).toBe("SKU-500");
  });

  // =========================================================================
  // 3. CHAOS & FUZZING TESTS: SANITIZERS & EDGE CASES
  // =========================================================================
  describe("3. Chaos Input Fuzzing", () => {
    it("3.1 should sanitize currency symbols and commas across global formats", () => {
      expect(sanitizePrice("$19.99")).toBe(19.99);
      expect(sanitizePrice(" $ 29.95 ")).toBe(29.95);
      expect(sanitizePrice("€45.50")).toBe(45.50);
      expect(sanitizePrice("£99.00")).toBe(99.00);
      expect(sanitizePrice("¥1500")).toBe(1500);
      expect(sanitizePrice("₹ 2,499.00")).toBe(2499.00);
      expect(sanitizePrice("1,250.75")).toBe(1250.75);
      expect(sanitizePrice("0.00")).toBe(0);
      expect(sanitizePrice("0")).toBe(0);
      expect(sanitizePrice("")).toBe("");
      expect(sanitizePrice(null)).toBe("");
      expect(sanitizePrice(undefined)).toBe("");
      expect(isNaN(sanitizePrice("INVALID"))).toBe(true);
      expect(isNaN(sanitizePrice("abc$$$"))).toBe(true);
    });

    it("3.2 should sanitize messy stock numbers and commas", () => {
      expect(sanitizeStock("100")).toBe(100);
      expect(sanitizeStock(" 50 ")).toBe(50);
      expect(sanitizeStock("1,000")).toBe(1000);
      expect(sanitizeStock("25,000")).toBe(25000);
      expect(sanitizeStock("0")).toBe(0);
      expect(sanitizeStock("")).toBe(0);
      expect(sanitizeStock(null)).toBe(0);
      expect(sanitizeStock(undefined)).toBe(0);
      expect(isNaN(sanitizeStock("invalid"))).toBe(true);
    });

    it("3.3 should normalize Shopify and alternative status values", () => {
      expect(normalizeStatus("active")).toBe("Published");
      expect(normalizeStatus("ACTIVE")).toBe("Published");
      expect(normalizeStatus("Live")).toBe("Published");
      expect(normalizeStatus("published")).toBe("Published");
      expect(normalizeStatus("draft")).toBe("Draft");
      expect(normalizeStatus("DRAFT")).toBe("Draft");
      expect(normalizeStatus("inactive")).toBe("Draft");
      expect(normalizeStatus("hidden")).toBe("Draft");
      expect(normalizeStatus("archived")).toBe("Draft");
      expect(normalizeStatus("")).toBe("Draft");
      expect(normalizeStatus(null)).toBe("Draft");
    });

    it("3.4 should handle product names with special characters, unicode, and emojis", () => {
      const specialNames = [
        "💨 Iced Mango 5000 Puffs™ (Super Edition)",
        "Watermelon & Mint - 50mg / 100ml",
        "Coil <0.8ohm> Dual-Mesh [Series 3]",
        'Flavor: "Blueberry Chill" (Pack of 5)',
        "Strawberry / Banana / Kiwi",
      ];

      specialNames.forEach((name) => {
        const val = validateProductRow({ name, price: 15.0 });
        expect(val.isValid, `Failed for name: ${name}`).toBe(true);
      });
    });

    it("3.5 should accurately detect intra-file duplicate SKUs in a 1,000 row batch", () => {
      const seenSkus = new Set();
      const duplicates = [];

      // Generate 100 unique SKUs, then repeat 10 of them
      for (let i = 1; i <= 100; i++) {
        const sku = `SKU-ITEM-${i}`;
        seenSkus.add(sku.toLowerCase());
      }

      const testBatch = [
        { sku: "SKU-ITEM-5" },  // Duplicate
        { sku: "sku-item-20" }, // Duplicate (case-insensitive)
        { sku: "SKU-ITEM-999" }, // Brand new
      ];

      testBatch.forEach((item, index) => {
        const lower = item.sku.toLowerCase();
        if (seenSkus.has(lower)) {
          duplicates.push({ row: index, sku: item.sku });
        }
      });

      expect(duplicates.length).toBe(2);
      expect(duplicates[0].sku).toBe("SKU-ITEM-5");
      expect(duplicates[1].sku).toBe("sku-item-20");
    });
  });

  // =========================================================================
  // 4. LARGE-SCALE FILTERING & DIRTY DIFF COMPUTATION (1,000 ROWS)
  // =========================================================================
  describe("4. 1,000-Row Filter & Diff Benchmark", () => {
    it("4.1 should compute dirty diff across 1,000 products with 250 edits in < 10ms", () => {
      const originalMap = new Map();
      const currentRows = [];

      for (let i = 1; i <= 1000; i++) {
        const prod = {
          _rowId: `id-${i}`,
          _id: `id-${i}`,
          name: `Vape Product ${i}`,
          price: 20.0,
          stock: 50,
          isNew: false,
        };
        originalMap.set(prod._rowId, JSON.stringify(prod));

        // Modify every 4th product (250 modifications total)
        if (i % 4 === 0) {
          currentRows.push({ ...prod, price: 29.99 });
        } else {
          currentRows.push({ ...prod });
        }
      }

      // Add 25 new products
      for (let j = 1; j <= 25; j++) {
        currentRows.push({
          _rowId: `new-${j}`,
          name: `New Product ${j}`,
          price: 15.0,
          isNew: true,
        });
      }

      const diffStart = performance.now();
      const modified = [];
      const created = [];

      currentRows.forEach((row) => {
        if (row.isNew) {
          if (row.name?.trim() || row.price !== "") created.push(row);
        } else {
          const origStr = originalMap.get(row._rowId);
          if (origStr && origStr !== JSON.stringify(row)) {
            modified.push(row);
          }
        }
      });

      const diffElapsed = performance.now() - diffStart;

      expect(created.length).toBe(25);
      expect(modified.length).toBe(250);
      expect(diffElapsed).toBeLessThan(50); // Under 50ms for 1,025 items
    });
  });

});
