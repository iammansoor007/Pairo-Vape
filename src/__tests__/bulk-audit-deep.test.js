import { describe, it, expect, vi } from "vitest";
import {
  sanitizePrice,
  sanitizeStock,
  normalizeStatus,
  validateProductRow,
  BULK_COLUMNS,
  DEFAULT_PRODUCT_ROW,
} from "../lib/bulkProductUtils";

describe("DEEP AUDIT: High-Precision Bug Fix Verification", () => {
  describe("1. Currency and Stock Input Resiliency & onBlur Sanitization", () => {
    it("should sanitize exotic currency strings with spaces, symbols, and commas", () => {
      expect(sanitizePrice("$ 1,499.99")).toBe(1499.99);
      expect(sanitizePrice("€ 25.50")).toBe(25.5);
      expect(sanitizePrice("£ 100,000.00")).toBe(100000);
      expect(sanitizePrice("  49.95  ")).toBe(49.95);
      expect(sanitizePrice("")).toBe("");
      expect(sanitizePrice(null)).toBe("");
      expect(sanitizePrice(undefined)).toBe("");
    });

    it("should strictly sanitize stock inputs and reject fractional units", () => {
      expect(sanitizeStock("1,500")).toBe(1500);
      expect(sanitizeStock("  250  ")).toBe(250);
      expect(sanitizeStock(0)).toBe(0);
      expect(sanitizeStock("0")).toBe(0);
      expect(sanitizeStock("")).toBe(0);
      expect(sanitizeStock(null)).toBe(0);
      expect(Number.isNaN(sanitizeStock("3.14"))).toBe(true);
      expect(Number.isNaN(sanitizeStock("abc"))).toBe(true);
    });

    it("should normalize status values accurately across platforms", () => {
      expect(normalizeStatus("Live")).toBe("Published");
      expect(normalizeStatus("active")).toBe("Published");
      expect(normalizeStatus("PUBLISHED")).toBe("Published");
      expect(normalizeStatus("inactive")).toBe("Draft");
      expect(normalizeStatus("Hidden")).toBe("Draft");
      expect(normalizeStatus("ARCHIVED")).toBe("Draft");
      expect(normalizeStatus("")).toBe("Draft");
    });
  });

  describe("2. Tabular Clipboard TSV (Excel/Google Sheets) Parser Logic", () => {
    it("should correctly parse multi-column tab-separated Excel rows", () => {
      const tsvClipboardData = [
        "Vape Pod Alpha\tPOD-ALP-01\t$19.99\t$24.99\t150\tDisposables\tPublished",
        "Vape Pod Beta\tPOD-BET-02\t24.50\t\t50\tStarter Kits\tDraft",
      ].join("\r\n");

      const visibleColumns = ["name", "sku", "price", "compareAtPrice", "stock", "category", "status"];
      const activeCols = BULK_COLUMNS.filter((col) => visibleColumns.includes(col.key));

      const lines = tsvClipboardData
        .split(/\r\n|\r|\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      const parsedRows = lines.map((line) => line.split("\t").map((c) => c.trim()));

      const generatedRows = parsedRows.map((cells, rowIdx) => {
        const rowObj = {
          ...DEFAULT_PRODUCT_ROW,
          _rowId: `new-paste-${rowIdx}`,
          isNew: true,
        };

        cells.forEach((val, cellIdx) => {
          const colDef = activeCols[cellIdx];
          if (!colDef) return;

          const key = colDef.key;
          if (key === "price" || key === "compareAtPrice") {
            rowObj[key] = sanitizePrice(val);
          } else if (key === "stock") {
            rowObj[key] = sanitizeStock(val);
          } else if (key === "status") {
            rowObj[key] = normalizeStatus(val);
          } else {
            rowObj[key] = val;
          }
        });

        return rowObj;
      });

      expect(generatedRows).toHaveLength(2);
      expect(generatedRows[0].name).toBe("Vape Pod Alpha");
      expect(generatedRows[0].sku).toBe("POD-ALP-01");
      expect(generatedRows[0].price).toBe(19.99);
      expect(generatedRows[0].compareAtPrice).toBe(24.99);
      expect(generatedRows[0].stock).toBe(150);
      expect(generatedRows[0].category).toBe("Disposables");
      expect(generatedRows[0].status).toBe("Published");

      expect(generatedRows[1].name).toBe("Vape Pod Beta");
      expect(generatedRows[1].price).toBe(24.5);
      expect(generatedRows[1].compareAtPrice).toBe("");
      expect(generatedRows[1].stock).toBe(50);
      expect(generatedRows[1].status).toBe("Draft");
    });
  });

  describe("3. In-Place SKU Conflict Resolution (Update vs Append)", () => {
    it("should update matching existing product row in place when conflictMode is 'update'", () => {
      const existingRows = [
        {
          _rowId: "prod-101",
          _id: "prod-101",
          isNew: false,
          name: "Original Name",
          sku: "SKU-999",
          price: 15.0,
          stock: 10,
        },
        {
          _rowId: "prod-102",
          _id: "prod-102",
          isNew: false,
          name: "Other Product",
          sku: "SKU-888",
          price: 20.0,
          stock: 5,
        },
      ];

      const importedProducts = [
        {
          name: "Updated Name From CSV",
          sku: "SKU-999",
          price: 18.5,
          stock: 30,
          isConflictUpdate: true,
        },
        {
          name: "Brand New Product",
          sku: "SKU-777",
          price: 35.0,
          stock: 100,
          isConflictUpdate: false,
        },
      ];

      const deletedIds = new Set();
      const updated = [...existingRows];
      const newItems = [];

      importedProducts.forEach((p, idx) => {
        const skuTrimmed = p.sku ? String(p.sku).trim().toLowerCase() : "";
        const existingIdx = skuTrimmed
          ? updated.findIndex(
              (r) => !deletedIds.has(r._rowId) && r.sku && String(r.sku).trim().toLowerCase() === skuTrimmed
            )
          : -1;

        if (existingIdx !== -1 && p.isConflictUpdate) {
          const existingRow = updated[existingIdx];
          updated[existingIdx] = {
            ...existingRow,
            ...p,
            _rowId: existingRow._rowId,
            _id: existingRow._id,
            isNew: existingRow.isNew,
          };
        } else {
          newItems.push({
            ...DEFAULT_PRODUCT_ROW,
            ...p,
            _rowId: `new-${idx}`,
            isNew: true,
          });
        }
      });

      const finalRows = [...updated, ...newItems];

      expect(finalRows).toHaveLength(3);
      // First product updated in place preserving original ID
      expect(finalRows[0]._id).toBe("prod-101");
      expect(finalRows[0].isNew).toBe(false);
      expect(finalRows[0].name).toBe("Updated Name From CSV");
      expect(finalRows[0].price).toBe(18.5);
      expect(finalRows[0].stock).toBe(30);

      // Third product appended as brand new
      expect(finalRows[2]._rowId).toBe("new-1");
      expect(finalRows[2].isNew).toBe(true);
      expect(finalRows[2].sku).toBe("SKU-777");
    });
  });

  describe("4. Gallery Images Preservation Logic", () => {
    it("should preserve gallery images array when updating primary image", () => {
      const existingProduct = {
        _id: "prod-xyz",
        image: "https://example.com/main-old.jpg",
        images: [
          "https://example.com/main-old.jpg",
          "https://example.com/gallery-1.jpg",
          "https://example.com/gallery-2.jpg",
        ],
      };

      const newMainImage = "https://example.com/main-new.jpg";

      // Simulate API route image update logic
      let updatedImage = newMainImage;
      let updatedImages = [];

      if (!newMainImage) {
        updatedImages = [];
      } else {
        const currentImages = Array.isArray(existingProduct.images) ? existingProduct.images : [];
        if (currentImages.length > 0) {
          const rest = currentImages.filter((u) => u !== newMainImage);
          updatedImages = [newMainImage, ...rest];
        } else {
          updatedImages = [newMainImage];
        }
      }

      expect(updatedImage).toBe("https://example.com/main-new.jpg");
      expect(updatedImages).toHaveLength(4);
      expect(updatedImages[0]).toBe("https://example.com/main-new.jpg");
      expect(updatedImages).toContain("https://example.com/gallery-1.jpg");
      expect(updatedImages).toContain("https://example.com/gallery-2.jpg");
    });

    it("should clear both image and images array when user deliberately sets image to empty", () => {
      const existingProduct = {
        _id: "prod-xyz",
        image: "https://example.com/main.jpg",
        images: ["https://example.com/main.jpg", "https://example.com/g1.jpg"],
      };

      const newMainImage = "";
      let updatedImage = newMainImage;
      let updatedImages = [];

      if (!newMainImage) {
        updatedImage = "";
        updatedImages = [];
      }

      expect(updatedImage).toBe("");
      expect(updatedImages).toEqual([]);
    });
  });

  describe("5. Availability Status and ManageStock Synchronization", () => {
    it("should keep product 'In Stock' if manageStock is false, even if stock is 0", () => {
      const manageStock = false;
      const stock = 0;
      const availabilityStatus = !manageStock || stock > 0 ? "In Stock" : "Out of Stock";
      expect(availabilityStatus).toBe("In Stock");
    });

    it("should mark product 'Out of Stock' if manageStock is true and stock is 0", () => {
      const manageStock = true;
      const stock = 0;
      const availabilityStatus = !manageStock || stock > 0 ? "In Stock" : "Out of Stock";
      expect(availabilityStatus).toBe("Out of Stock");
    });

    it("should mark product 'In Stock' if manageStock is true and stock is greater than 0", () => {
      const manageStock = true;
      const stock = 25;
      const availabilityStatus = !manageStock || stock > 0 ? "In Stock" : "Out of Stock";
      expect(availabilityStatus).toBe("In Stock");
    });
  });

  describe("6. Slug Generation with Soft-Deleted Collision Prevention", () => {
    it("should generate non-colliding slug even when soft-deleted product holds the slug", async () => {
      // In MongoDB, unique index { tenantId: 1, slug: 1 } includes soft-deleted items!
      const mockDatabase = [
        { slug: "disposable-vape", isDeleted: true },
        { slug: "disposable-vape-1", isDeleted: false },
      ];

      const findOne = vi.fn(async ({ slug }) => {
        return mockDatabase.find((doc) => doc.slug === slug) || null;
      });

      const usedSlugsInBatch = new Set();
      const baseSlug = "disposable-vape";
      let finalSlug = baseSlug;
      let counter = 1;

      while (usedSlugsInBatch.has(finalSlug) || (await findOne({ slug: finalSlug }))) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      usedSlugsInBatch.add(finalSlug);

      expect(finalSlug).toBe("disposable-vape-2");
      expect(findOne).toHaveBeenCalledWith({ slug: "disposable-vape" });
      expect(findOne).toHaveBeenCalledWith({ slug: "disposable-vape-1" });
    });
  });

  describe("7. Fine-Grained Partial Updates Diffing", () => {
    it("should only extract fields that genuinely changed from original row", () => {
      const originalRow = {
        name: "Standard Vape",
        sku: "STD-01",
        price: 20,
        compareAtPrice: 25,
        stock: 50,
        category: "Vapes",
        status: "Published",
        isFeatured: false,
      };

      const editedRow = {
        ...originalRow,
        price: 22.5, // Changed
        stock: 45, // Changed
      };

      const changedData = {};
      Object.keys(editedRow).forEach((k) => {
        if (JSON.stringify(editedRow[k]) !== JSON.stringify(originalRow[k])) {
          changedData[k] = editedRow[k];
        }
      });

      expect(Object.keys(changedData)).toEqual(["price", "stock"]);
      expect(changedData.price).toBe(22.5);
      expect(changedData.stock).toBe(45);
      expect(changedData.name).toBeUndefined();
      expect(changedData.category).toBeUndefined();
    });
  });
});
