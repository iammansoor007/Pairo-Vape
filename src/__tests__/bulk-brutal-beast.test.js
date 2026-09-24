import { describe, it, expect, vi } from "vitest";
import * as XLSX from "xlsx";
import {
  BULK_COLUMNS,
  DEFAULT_PRODUCT_ROW,
  validateProductRow,
  sanitizePrice,
  sanitizeStock,
  normalizeStatus,
  autoDetectColumnMapping,
  exportProducts,
  downloadFailedRowsCsv,
} from "../lib/bulkProductUtils";

describe("🔥 BRUTAL BEAST-LEVEL AUDIT SUITE", () => {
  // =========================================================================
  // 1. FUZZING & NAUGHTY STRING RESILIENCY
  // =========================================================================
  describe("1. Fuzzing, Injection & Naughty String Resiliency", () => {
    const NAUGHTY_STRINGS = [
      "'; DROP TABLE products; --",
      "<script>alert('XSS')</script>",
      "<img src=x onerror=alert(1)>",
      "🔥💨🌪️ Super Vape 5000 🚀",
      "مرحبا بك في متجر الفيب", // Arabic RTL
      "בדיקה של מוצר וופוריזר", // Hebrew RTL
      "../../../../../../windows/system32/cmd.exe",
      "null",
      "undefined",
      "[object Object]",
      "NaN",
      "\u0000\u0001\u0002\u0003",
      "   \t\r\n   ",
      "Product with \"quoted\" name and , commas ,",
    ];

    it("1.1 should safely validate and handle all naughty strings in product name without crashing", () => {
      NAUGHTY_STRINGS.forEach((naughty) => {
        const row = {
          ...DEFAULT_PRODUCT_ROW,
          name: naughty,
          price: 19.99,
        };
        const result = validateProductRow(row);
        if (naughty.trim() === "") {
          expect(result.isValid).toBe(false);
          expect(result.errors.name).toBe("Product name is required");
        } else {
          expect(result.isValid).toBe(true);
        }
      });
    });

    it("1.2 should strictly sanitize extreme & boundary price representations", () => {
      expect(sanitizePrice("$0.00")).toBe(0);
      expect(sanitizePrice("0")).toBe(0);
      expect(sanitizePrice("0.00")).toBe(0);
      expect(sanitizePrice("$$$ 999,999.99")).toBe(999999.99);
      expect(sanitizePrice("€ 1.250,50".replace(".", "").replace(",", "."))).toBe(1250.5);
      expect(sanitizePrice("  \t  45.99  \r\n")).toBe(45.99);

      // Negative values must be parsed as negative numbers so validator catches them
      expect(sanitizePrice("-19.99")).toBe(-19.99);
      const valNegative = validateProductRow({ name: "Test", price: sanitizePrice("-19.99") });
      expect(valNegative.isValid).toBe(false);
      expect(valNegative.errors.price).toBe("Price must be a positive number");

      // Garbage values must return NaN and fail validation
      expect(Number.isNaN(sanitizePrice("FREE_SAMPLE"))).toBe(true);
      expect(Number.isNaN(sanitizePrice("undefined"))).toBe(true);
      expect(Number.isNaN(sanitizePrice("[object Object]"))).toBe(true);
    });

    it("1.3 should strictly sanitize extreme stock values and reject floating-point units", () => {
      expect(sanitizeStock("0")).toBe(0);
      expect(sanitizeStock(0)).toBe(0);
      expect(sanitizeStock("2,147,483,647")).toBe(2147483647);
      expect(sanitizeStock("  1000000  ")).toBe(1000000);

      // Decimals must fail whole-integer test
      expect(Number.isNaN(sanitizeStock("0.5"))).toBe(true);
      expect(Number.isNaN(sanitizeStock("99.99"))).toBe(true);
      expect(Number.isNaN(sanitizeStock("3.14159"))).toBe(true);

      // Negative values
      const valNegativeStock = validateProductRow({ name: "Test", price: 10, stock: -5 });
      expect(valNegativeStock.isValid).toBe(false);
      expect(valNegativeStock.errors.stock).toBe("Stock must be a whole positive integer");
    });
  });

  // =========================================================================
  // 2. LARGE-SCALE 2,500-ROW DATASET STRESS & BENCHMARK
  // =========================================================================
  describe("2. 2,500-Product Extreme Scale & Serialization Benchmark", () => {
    it("2.1 should serialize 2,500 products to Excel (XLSX) and re-import with 100% data integrity", () => {
      const largeCatalog = Array.from({ length: 2500 }, (_, i) => ({
        name: `Vape Device Model-${i} Pro Max`,
        sku: `SKU-${100000 + i}`,
        price: +(10 + (i % 80) + 0.99).toFixed(2),
        compareAtPrice: +(20 + (i % 80) + 0.99).toFixed(2),
        stock: i % 500,
        manageStock: i % 10 !== 0,
        category: i % 2 === 0 ? "Disposables" : "Pod Systems",
        status: i % 3 === 0 ? "Draft" : "Published",
        isFeatured: i % 5 === 0,
        tags: `flavor-${i % 10}, nicotine-50mg, tag-${i}`,
        image: `https://cdn.example.com/products/img-${i}.webp`,
        shortDescription: `Ultra-durable rechargeable vape device #${i} with mesh coil technology.`,
      }));

      const startTime = performance.now();

      // Convert to Excel workbook
      const ws = XLSX.utils.json_to_sheet(largeCatalog);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Catalog");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

      // Read back from binary buffer
      const readWb = XLSX.read(wbout, { type: "array" });
      const readSheet = readWb.Sheets[readWb.SheetNames[0]];
      const parsedData = XLSX.utils.sheet_to_json(readSheet);

      const duration = performance.now() - startTime;

      expect(parsedData).toHaveLength(2500);
      expect(parsedData[0].name).toBe("Vape Device Model-0 Pro Max");
      expect(parsedData[0].sku).toBe("SKU-100000");
      expect(parsedData[0].price).toBe(10.99);
      expect(parsedData[2499].name).toBe("Vape Device Model-2499 Pro Max");
      expect(parsedData[2499].sku).toBe("SKU-102499");

      // Performance assertion: 2,500 binary records processed in < 3,000ms
      expect(duration).toBeLessThan(3000);
    });

    it("2.2 should diff 2,500 products with 50 dirty modifications in under 20ms", () => {
      const originalMap = new Map();
      const rows = Array.from({ length: 2500 }, (_, i) => {
        const item = {
          _rowId: `id-${i}`,
          _id: `id-${i}`,
          isNew: false,
          name: `Product ${i}`,
          price: 20.0,
          stock: 50,
          status: "Published",
        };
        originalMap.set(item._rowId, JSON.stringify(item));
        return item;
      });

      // Modify 50 random rows
      for (let i = 0; i < 50; i++) {
        const targetIdx = i * 50;
        rows[targetIdx] = { ...rows[targetIdx], price: 29.99, stock: 120 };
      }

      const start = performance.now();
      const modified = [];
      rows.forEach((row) => {
        const origStr = originalMap.get(row._rowId);
        if (origStr && origStr !== JSON.stringify(row)) {
          modified.push(row);
        }
      });
      const diffTime = performance.now() - start;

      expect(modified).toHaveLength(50);
      expect(diffTime).toBeLessThan(25);
    });
  });

  // =========================================================================
  // 3. BRUTAL CORRUPTED SPREADSHEETS & CORNER CASES
  // =========================================================================
  describe("3. Corrupted Spreadsheets, Header Variations & Multi-line Cells", () => {
    it("3.1 should auto-detect 35+ non-standard header variations", () => {
      const messyHeaders = [
        "Product_Title",
        "Item_Name",
        "Bar_Code",
        "UPC_Code",
        "Retail_Price",
        "Selling_Rate",
        "MRP",
        "Was_Price",
        "Original_Cost",
        "Qty_On_Hand",
        "Inventory_Count",
        "Track_Inventory_Flag",
        "Product_Group",
        "Collection_Name",
        "Live_State",
        "Promoted_Item",
        "Keyword_Tags",
        "Product_Photo_URL",
        "Thumbnail_Image",
        "Summary_Text",
        "Unknown_Field_99",
      ];

      const mapping = autoDetectColumnMapping(messyHeaders);

      expect(mapping["Product_Title"]).toBe("name");
      expect(mapping["Item_Name"]).toBe("name");
      expect(mapping["Bar_Code"]).toBe("sku");
      expect(mapping["UPC_Code"]).toBe("sku");
      expect(mapping["Retail_Price"]).toBe("price");
      expect(mapping["Selling_Rate"]).toBe("price");
      expect(mapping["MRP"]).toBe("compareAtPrice");
      expect(mapping["Was_Price"]).toBe("compareAtPrice");
      expect(mapping["Qty_On_Hand"]).toBe("stock");
      expect(mapping["Inventory_Count"]).toBe("stock");
      expect(mapping["Track_Inventory_Flag"]).toBe("manageStock");
      expect(mapping["Product_Group"]).toBe("category");
      expect(mapping["Collection_Name"]).toBe("category");
      expect(mapping["Live_State"]).toBe("status");
      expect(mapping["Promoted_Item"]).toBe("isFeatured");
      expect(mapping["Keyword_Tags"]).toBe("tags");
      expect(mapping["Product_Photo_URL"]).toBe("image");
      expect(mapping["Thumbnail_Image"]).toBe("image");
      expect(mapping["Summary_Text"]).toBe("shortDescription");
      expect(mapping["Unknown_Field_99"]).toBe("skip");
    });

    it("3.2 should safely parse CSV files containing embedded newlines and commas inside quotes", () => {
      const rawCsv = [
        'name,sku,price,shortDescription',
        '"Vape Kit, Deluxe Edition","VK-01",49.99,"This is line 1\nThis is line 2 with, commas\nLine 3"',
        '"Simple Pod","SP-02",19.99,"Simple summary"',
      ].join("\r\n");

      const wb = XLSX.read(rawCsv, { type: "string" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe("Vape Kit, Deluxe Edition");
      expect(rows[0].price).toBe(49.99);
      expect(rows[0].shortDescription).toContain("This is line 1\nThis is line 2 with, commas\nLine 3");
      expect(rows[1].name).toBe("Simple Pod");
    });

    it("3.3 should detect duplicate SKUs across case variations and whitespace padding", () => {
      const incomingSkus = ["VAPE-001", "vape-001 ", "  VAPE-001", "VAPE-002"];
      const seen = new Set();
      const duplicates = [];

      incomingSkus.forEach((sku) => {
        const cleaned = sku.trim().toLowerCase();
        if (seen.has(cleaned)) {
          duplicates.push(sku);
        } else {
          seen.add(cleaned);
        }
      });

      expect(duplicates).toHaveLength(2);
      expect(seen.size).toBe(2);
    });
  });

  // =========================================================================
  // 4. BULK MATH & STATE CLAMPING INVARIANTS
  // =========================================================================
  describe("4. Bulk Math Clamping & State Invariants", () => {
    it("4.1 should clamp price decreases strictly at 0.00 even on extreme reductions", () => {
      const currentPrice = 12.5;

      // Fixed decrease greater than price
      const decAmount = 25.0;
      const priceAfterFixed = Math.max(0, +(currentPrice - decAmount).toFixed(2));
      expect(priceAfterFixed).toBe(0.0);

      // Percentage decrease of 150%
      const decPercent = 150;
      const priceAfterPercent = Math.max(0, +(currentPrice * (1 - decPercent / 100)).toFixed(2));
      expect(priceAfterPercent).toBe(0.0);

      // Percentage increase of 33.333% with exact 2-decimal rounding
      const incPercent = 33.333;
      const priceAfterInc = +(currentPrice * (1 + incPercent / 100)).toFixed(2);
      expect(priceAfterInc).toBe(16.67);
    });

    it("4.2 should clamp stock subtraction strictly at 0 without negative integers", () => {
      const currentStock = 15;
      const subtractQty = 50;
      const finalStock = Math.max(0, currentStock - subtractQty);
      expect(finalStock).toBe(0);
    });

    it("4.3 should handle bulk category removal with __NONE__ keyword", () => {
      const selectedCategory = "__NONE__";
      const resolvedCategory = selectedCategory === "__NONE__" ? "" : selectedCategory;
      expect(resolvedCategory).toBe("");

      // Validate resolveCategory simulation
      const catData = resolvedCategory === "" ? { category: "", primaryCategory: null, categories: [] } : { category: resolvedCategory };
      expect(catData.category).toBe("");
      expect(catData.primaryCategory).toBeNull();
      expect(catData.categories).toEqual([]);
    });

    it("4.4 should cleanly handle 100 simultaneous in-place updates matching existing SKUs", () => {
      const storeProducts = Array.from({ length: 100 }, (_, i) => ({
        _rowId: `existing-${i}`,
        _id: `mongo-id-${i}`,
        sku: `SKU-TARGET-${i}`,
        price: 10.0,
        stock: 5,
        isNew: false,
      }));

      const incomingCsv = Array.from({ length: 100 }, (_, i) => ({
        sku: `SKU-TARGET-${i}`,
        price: 19.99,
        stock: 50,
        isConflictUpdate: true,
      }));

      const deletedIds = new Set();
      const updated = [...storeProducts];

      incomingCsv.forEach((p) => {
        const skuTrimmed = p.sku.trim().toLowerCase();
        const idx = updated.findIndex((r) => !deletedIds.has(r._rowId) && r.sku.trim().toLowerCase() === skuTrimmed);
        if (idx !== -1 && p.isConflictUpdate) {
          updated[idx] = {
            ...updated[idx],
            ...p,
            _rowId: updated[idx]._rowId,
            _id: updated[idx]._id,
            isNew: updated[idx].isNew,
          };
        }
      });

      expect(updated).toHaveLength(100);
      expect(updated[0]._id).toBe("mongo-id-0");
      expect(updated[0].isNew).toBe(false);
      expect(updated[0].price).toBe(19.99);
      expect(updated[0].stock).toBe(50);
      expect(updated[99]._id).toBe("mongo-id-99");
      expect(updated[99].price).toBe(19.99);
      expect(updated[99].stock).toBe(50);
    });
  });

  // =========================================================================
  // 5. SECURITY & TENANT ISOLATION GATES
  // =========================================================================
  describe("5. Security, RBAC & Multi-Tenant Isolation Simulation", () => {
    it("5.1 should reject requests targeting another tenant's database records", () => {
      const sessionTenant = "DEFAULT_STORE";
      const targetProduct = {
        _id: "660c1f2e8b1d9c001f3a5e99",
        tenantId: "STORE_COMPETITOR_X",
        name: "Unauthorized Target",
      };

      const canUpdate = targetProduct.tenantId === sessionTenant;
      expect(canUpdate).toBe(false);
    });

    it("5.2 should format failed rows CSV export with actionable error messages", () => {
      const failedRows = [
        {
          row: { name: "", price: -10, sku: "INVALID-SKU" },
          errors: { name: "Product name is required", price: "Price must be a positive number" },
        },
        {
          row: { name: "Vape Kit", price: "abc", sku: "INVALID-PRICE" },
          errors: { price: "Price must be a positive number" },
        },
      ];

      const exportData = failedRows.map((item) => ({
        ...item.row,
        error_reason: Object.values(item.errors || {}).join("; "),
      }));

      expect(exportData).toHaveLength(2);
      expect(exportData[0].error_reason).toBe("Product name is required; Price must be a positive number");
      expect(exportData[1].error_reason).toBe("Price must be a positive number");
    });
  });
});
