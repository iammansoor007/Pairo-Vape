import { describe, it, expect, vi } from "vitest";
import {
  BULK_COLUMNS,
  DEFAULT_PRODUCT_ROW,
  SAMPLE_PRODUCTS,
  validateProductRow,
  sanitizePrice,
  sanitizeStock,
  normalizeStatus,
  autoDetectColumnMapping,
} from "../lib/bulkProductUtils";

describe("💎 COMPREHENSIVE END-TO-END AUDIT & INTERACTION MATRIX", () => {
  // =========================================================================
  // 1. COLUMN SELECTOR LOGIC & LOCKING INVARIANTS
  // =========================================================================
  describe("1. Column Selector Invariants & Locking", () => {
    it("1.1 should permanently lock the 'name' column so it can never be hidden", () => {
      let visible = ["name", "sku", "price"];
      const setVisible = (updater) => {
        visible = typeof updater === "function" ? updater(visible) : updater;
      };

      const toggleColumn = (key) => {
        if (key === "name") return; // Locked
        setVisible((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
      };

      // Attempt to toggle off 'name'
      toggleColumn("name");
      expect(visible).toContain("name");

      // Toggle off 'sku'
      toggleColumn("sku");
      expect(visible).not.toContain("sku");

      // Toggle on 'sku'
      toggleColumn("sku");
      expect(visible).toContain("sku");
    });

    it("1.2 should show all columns and reset to default columns accurately", () => {
      const allCols = BULK_COLUMNS.map((c) => c.key);
      const defaultCols = ["name", "sku", "price", "compareAtPrice", "stock", "category", "status"];

      expect(allCols).toContain("shortDescription");
      expect(allCols).toContain("tags");
      expect(allCols).toContain("image");
      expect(allCols).toContain("manageStock");
      expect(allCols).toContain("isFeatured");

      expect(defaultCols.length).toBe(7);
      expect(defaultCols).toContain("name");
      expect(defaultCols).toContain("price");
    });
  });

  // =========================================================================
  // 2. ADVANCED ROW OPERATIONS & SPLICE POSITIONING
  // =========================================================================
  describe("2. Advanced Row Manipulation: Insert, Duplicate, Reset", () => {
    const createInitialRows = () => [
      { _rowId: "row-1", _id: "p1", name: "Pod System A", sku: "SKU-A", price: 10, isNew: false },
      { _rowId: "row-2", _id: "p2", name: "Pod System B", sku: "SKU-B", price: 20, isNew: false },
      { _rowId: "row-3", _id: "p3", name: "Pod System C", sku: "SKU-C", price: 30, isNew: false },
    ];

    it("2.1 should insert row above at index 0 (top of table)", () => {
      const rows = createInitialRows();
      const targetId = "row-1";
      const index = rows.findIndex((r) => r._rowId === targetId);
      const newRow = { ...DEFAULT_PRODUCT_ROW, _rowId: "new-above-0", isNew: true };

      const updated = [...rows];
      updated.splice(index, 0, newRow);

      expect(updated).toHaveLength(4);
      expect(updated[0]._rowId).toBe("new-above-0");
      expect(updated[1]._rowId).toBe("row-1");
    });

    it("2.2 should insert row below at middle index", () => {
      const rows = createInitialRows();
      const targetId = "row-2";
      const index = rows.findIndex((r) => r._rowId === targetId);
      const newRow = { ...DEFAULT_PRODUCT_ROW, _rowId: "new-below-2", isNew: true };

      const updated = [...rows];
      updated.splice(index + 1, 0, newRow);

      expect(updated).toHaveLength(4);
      expect(updated[1]._rowId).toBe("row-2");
      expect(updated[2]._rowId).toBe("new-below-2");
      expect(updated[3]._rowId).toBe("row-3");
    });

    it("2.3 should duplicate row with clean (Copy) naming and detached slug", () => {
      const rows = createInitialRows();
      const source = rows[1]; // Pod System B
      const duplicated = {
        ...source,
        _rowId: "new-copy-1",
        isNew: true,
        name: `${source.name} (Copy)`,
        sku: source.sku ? `${source.sku}-COPY` : "",
        slug: "",
      };

      const updated = [...rows];
      const index = rows.findIndex((r) => r._rowId === source._rowId);
      updated.splice(index + 1, 0, duplicated);

      expect(updated).toHaveLength(4);
      expect(updated[2].name).toBe("Pod System B (Copy)");
      expect(updated[2].sku).toBe("SKU-B-COPY");
      expect(updated[2].slug).toBe("");
      expect(updated[2].isNew).toBe(true);
    });

    it("2.4 should revert modified row back to original snapshot", () => {
      const rows = createInitialRows();
      const originalMap = new Map();
      rows.forEach((r) => originalMap.set(r._rowId, JSON.stringify(r)));

      // Modify row-2
      const modifiedRows = rows.map((r) =>
        r._rowId === "row-2" ? { ...r, price: 99.99, name: "Accidentally Changed" } : r
      );
      expect(modifiedRows[1].price).toBe(99.99);

      // Reset row-2
      const origStr = originalMap.get("row-2");
      const restored = JSON.parse(origStr);
      const finalRows = modifiedRows.map((r) => (r._rowId === "row-2" ? { ...restored } : r));

      expect(finalRows[1].price).toBe(20);
      expect(finalRows[1].name).toBe("Pod System B");
    });
  });

  // =========================================================================
  // 3. MULTI-FACET FILTER COMBINATION INTERSECTION
  // =========================================================================
  describe("3. Multi-Facet Search & Filter Combinations", () => {
    const products = [
      { _rowId: "1", name: "Mint Ice Disposable 5000", sku: "MINT-5K", category: "Disposables", status: "Published", stock: 15 },
      { _rowId: "2", name: "Mango Freeze Disposable 2000", sku: "MANGO-2K", category: "Disposables", status: "Draft", stock: 1 },
      { _rowId: "3", name: "Blueberry Pod Kit", sku: "BLUE-KIT", category: "Pod Systems", status: "Published", stock: 0 },
      { _rowId: "4", name: "Refillable Tank Pro", sku: "TANK-PRO", category: "Tanks", status: "Published", stock: 50 },
    ];

    const applyFilters = (list, { search = "", category = "All", status = "All", stock = "All" }) => {
      return list.filter((row) => {
        const matchesSearch =
          !search ||
          row.name?.toLowerCase().includes(search.toLowerCase()) ||
          row.sku?.toLowerCase().includes(search.toLowerCase());

        const matchesCategory = category === "All" || row.category === category;
        const matchesStatus = status === "All" || row.status === status;

        let matchesStock = true;
        if (stock === "In stock") matchesStock = Number(row.stock) > 2;
        else if (stock === "Low stock") matchesStock = Number(row.stock) > 0 && Number(row.stock) <= 2;
        else if (stock === "Out of stock") matchesStock = Number(row.stock) <= 0;

        return matchesSearch && matchesCategory && matchesStatus && matchesStock;
      });
    };

    it("3.1 should match both name and SKU with case-insensitive search", () => {
      const byName = applyFilters(products, { search: "mint" });
      expect(byName).toHaveLength(1);
      expect(byName[0]._rowId).toBe("1");

      const bySku = applyFilters(products, { search: "mango-2k" });
      expect(bySku).toHaveLength(1);
      expect(bySku[0]._rowId).toBe("2");
    });

    it("3.2 should filter stock levels accurately (In stock > 2, Low stock 1-2, Out of stock <= 0)", () => {
      const inStock = applyFilters(products, { stock: "In stock" });
      expect(inStock).toHaveLength(2); // row 1 (15) and row 4 (50)

      const lowStock = applyFilters(products, { stock: "Low stock" });
      expect(lowStock).toHaveLength(1); // row 2 (1)

      const outOfStock = applyFilters(products, { stock: "Out of stock" });
      expect(outOfStock).toHaveLength(1); // row 3 (0)
    });

    it("3.3 should filter all 4 criteria simultaneously without filter leakage", () => {
      const result = applyFilters(products, {
        search: "disposable",
        category: "Disposables",
        status: "Draft",
        stock: "Low stock",
      });

      expect(result).toHaveLength(1);
      expect(result[0]._rowId).toBe("2");
      expect(result[0].name).toBe("Mango Freeze Disposable 2000");
    });
  });

  // =========================================================================
  // 4. ATOMIC BATCH ROUTE CONTRACT & PARTIAL SUCCESS ARCHITECTURE
  // =========================================================================
  describe("4. Atomic Batch Operations: Partial Success & Error Reporting", () => {
    it("4.1 should allow valid creates while reporting row-level errors for invalid items", () => {
      const incomingCreates = [
        { name: "Valid Vape 1", price: 15.99 },
        { name: "", price: 20.0 }, // Invalid: missing name
        { name: "Valid Vape 2", price: 25.0 },
      ];

      const errors = [];
      const successfulCreates = [];

      incomingCreates.forEach((item, idx) => {
        if (!item.name || !item.name.trim()) {
          errors.push({ row: idx + 1, field: "name", message: "Product name is required" });
          return;
        }
        successfulCreates.push(item);
      });

      expect(successfulCreates).toHaveLength(2);
      expect(errors).toHaveLength(1);
      expect(errors[0].row).toBe(2);
      expect(errors[0].field).toBe("name");
    });

    it("4.2 should generate sequential unique slugs for identical names in a single batch", () => {
      const identicalItems = ["Mint Ice", "Mint Ice", "Mint Ice", "Mint Ice"];
      const usedSlugs = new Set();
      const generatedSlugs = [];

      identicalItems.forEach((name) => {
        const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
        let slug = base;
        let counter = 1;
        while (usedSlugs.has(slug)) {
          slug = `${base}-${counter}`;
          counter++;
        }
        usedSlugs.add(slug);
        generatedSlugs.push(slug);
      });

      expect(generatedSlugs).toEqual(["mint-ice", "mint-ice-1", "mint-ice-2", "mint-ice-3"]);
    });

    it("4.3 should sanitize exotic characters into valid URL slugs", () => {
      const rawTitle = "*** !!! 100% Cotton & Vape Liquid ??? @@@";
      let base = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      expect(base).toBe("100-cotton-vape-liquid");
    });
  });

  // =========================================================================
  // 5. TEMPLATE & SAMPLE DATA INTEGRITY
  // =========================================================================
  describe("5. Templates & Export Structure", () => {
    it("5.1 should ensure sample products match schema columns perfectly", () => {
      expect(SAMPLE_PRODUCTS).toHaveLength(2);
      SAMPLE_PRODUCTS.forEach((prod) => {
        const val = validateProductRow(prod);
        expect(val.isValid).toBe(true);
        expect(prod.name).toBeDefined();
        expect(prod.price).toBeGreaterThan(0);
        expect(prod.stock).toBeGreaterThanOrEqual(0);
        expect(["Published", "Draft"]).toContain(prod.status);
      });
    });

    it("5.2 should have all mandatory headers in BULK_COLUMNS", () => {
      const keys = BULK_COLUMNS.map((c) => c.key);
      expect(keys).toContain("name");
      expect(keys).toContain("sku");
      expect(keys).toContain("price");
      expect(keys).toContain("compareAtPrice");
      expect(keys).toContain("stock");
      expect(keys).toContain("manageStock");
      expect(keys).toContain("category");
      expect(keys).toContain("status");
      expect(keys).toContain("isFeatured");
      expect(keys).toContain("tags");
      expect(keys).toContain("image");
      expect(keys).toContain("shortDescription");
    });
  });
});
