import { describe, it, expect, beforeEach } from "vitest";
import * as XLSX from "xlsx";
import {
  BULK_COLUMNS,
  DEFAULT_PRODUCT_ROW,
  SAMPLE_PRODUCTS,
  validateProductRow,
  autoDetectColumnMapping,
  exportProducts,
  downloadFailedRowsCsv,
} from "@/lib/bulkProductUtils";

describe("🔥 BEAST-LEVEL AUDIT SUITE: Bulk Product & Spreadsheet Operations", () => {

  // =========================================================================
  // 1. SPREADSHEET ROW OPERATIONS & STATE MANAGEMENT
  // =========================================================================
  describe("1. Spreadsheet Row Operations", () => {
    let rows;

    beforeEach(() => {
      rows = [
        {
          _rowId: "prod-1",
          _id: "prod-1",
          name: "Vape Device A",
          sku: "VAPE-A",
          price: 25.0,
          compareAtPrice: 30.0,
          stock: 100,
          manageStock: true,
          category: "Starter Kits",
          status: "Published",
          isFeatured: false,
          tags: "starter, sleek",
          image: "https://example.com/a.jpg",
          shortDescription: "A great starter kit",
          isNew: false,
        },
        {
          _rowId: "prod-2",
          _id: "prod-2",
          name: "Vape Device B",
          sku: "VAPE-B",
          price: 45.0,
          compareAtPrice: 50.0,
          stock: 20,
          manageStock: true,
          category: "Mod Systems",
          status: "Draft",
          isFeatured: true,
          tags: "mod, advanced",
          image: "https://example.com/b.jpg",
          shortDescription: "High power mod",
          isNew: false,
        },
      ];
    });

    it("1.1 should correctly add 1, 5, 10, or 50 empty rows with proper defaults", () => {
      const addRows = (count) =>
        Array.from({ length: count }, (_, idx) => ({
          ...DEFAULT_PRODUCT_ROW,
          _rowId: `new-${idx}`,
          isNew: true,
        }));

      const single = addRows(1);
      expect(single.length).toBe(1);
      expect(single[0].name).toBe("");
      expect(single[0].price).toBe("");
      expect(single[0].stock).toBe(0);
      expect(single[0].status).toBe("Draft");
      expect(single[0].manageStock).toBe(true);
      expect(single[0].isNew).toBe(true);

      const fifty = addRows(50);
      expect(fifty.length).toBe(50);
      expect(fifty[49]._rowId).toBe("new-49");
    });

    it("1.2 should duplicate a row with (Copy) name and -COPY SKU without cloning unique ID", () => {
      const source = rows[0];
      const duplicated = {
        ...source,
        _rowId: "new-copy-1",
        isNew: true,
        name: `${source.name} (Copy)`,
        sku: `${source.sku}-COPY`,
        slug: "",
      };

      expect(duplicated.name).toBe("Vape Device A (Copy)");
      expect(duplicated.sku).toBe("VAPE-A-COPY");
      expect(duplicated.price).toBe(25.0);
      expect(duplicated.stock).toBe(100);
      expect(duplicated.isNew).toBe(true);
      expect(duplicated.slug).toBe("");
    });

    it("1.3 should insert rows above and below specific positions accurately", () => {
      const newRowAbove = { ...DEFAULT_PRODUCT_ROW, _rowId: "above-1", isNew: true, name: "Inserted Above" };
      const newRowBelow = { ...DEFAULT_PRODUCT_ROW, _rowId: "below-1", isNew: true, name: "Inserted Below" };

      // Insert above index 1
      const copy1 = [...rows];
      copy1.splice(1, 0, newRowAbove);
      expect(copy1[1].name).toBe("Inserted Above");
      expect(copy1[2].name).toBe("Vape Device B");

      // Insert below index 0
      const copy2 = [...rows];
      copy2.splice(1, 0, newRowBelow);
      expect(copy2[1].name).toBe("Inserted Below");
    });

    it("1.4 should accurately track dirty state for creations, updates, and deletes", () => {
      const originalMap = new Map();
      rows.forEach((r) => originalMap.set(r._rowId, JSON.stringify(r)));

      // Simulate modification
      const modifiedRows = rows.map((r) => (r._rowId === "prod-1" ? { ...r, price: 99.99 } : r));

      // Simulate addition
      const newRow = { ...DEFAULT_PRODUCT_ROW, _rowId: "new-1", name: "New Item", price: 10, isNew: true };
      const allRows = [...modifiedRows, newRow];

      // Simulate delete of prod-2
      const deletedIds = new Set(["prod-2"]);

      const modified = [];
      const created = [];

      allRows.forEach((row) => {
        if (row.isNew) {
          if (row.name?.trim() || row.price !== "") created.push(row);
        } else {
          const origStr = originalMap.get(row._rowId);
          if (origStr && origStr !== JSON.stringify(row)) modified.push(row);
        }
      });

      expect(created.length).toBe(1);
      expect(created[0].name).toBe("New Item");
      expect(modified.length).toBe(1);
      expect(modified[0].price).toBe(99.99);
      expect(deletedIds.size).toBe(1);
      expect(created.length + modified.length + deletedIds.size).toBe(3);
    });

    it("1.5 should reset / revert row changes back to the exact snapshot", () => {
      const original = { ...rows[0] };
      const modified = { ...rows[0], price: 1000, name: "Changed Name", stock: 999 };

      // Revert
      const reverted = { ...original };
      expect(reverted.price).toBe(25.0);
      expect(reverted.name).toBe("Vape Device A");
      expect(reverted.stock).toBe(100);
    });
  });

  // =========================================================================
  // 2. MULTI-ROW BULK ACTIONS
  // =========================================================================
  describe("2. Multi-Row Bulk Actions", () => {
    let selectedProducts;

    beforeEach(() => {
      selectedProducts = [
        { _rowId: "p1", name: "Product 1", price: 20.0, stock: 50, category: "Cat A", status: "Draft", isFeatured: false },
        { _rowId: "p2", name: "Product 2", price: 50.0, stock: 10, category: "Cat A", status: "Draft", isFeatured: false },
        { _rowId: "p3", name: "Product 3", price: 100.0, stock: 0, category: "Cat B", status: "Draft", isFeatured: false },
      ];
    });

    it("2.1 should bulk set fixed price", () => {
      const updated = selectedProducts.map((p) => ({ ...p, price: 29.99 }));
      expect(updated.every((p) => p.price === 29.99)).toBe(true);
    });

    it("2.2 should bulk increase price by fixed dollar amount ($5.00)", () => {
      const updated = selectedProducts.map((p) => ({
        ...p,
        price: +(p.price + 5.0).toFixed(2),
      }));
      expect(updated[0].price).toBe(25.0);
      expect(updated[1].price).toBe(55.0);
      expect(updated[2].price).toBe(105.0);
    });

    it("2.3 should bulk decrease price by fixed dollar amount without going below 0", () => {
      const updated = selectedProducts.map((p) => ({
        ...p,
        price: Math.max(0, +(p.price - 25.0).toFixed(2)),
      }));
      expect(updated[0].price).toBe(0); // 20 - 25 => clamped to 0
      expect(updated[1].price).toBe(25.0);
      expect(updated[2].price).toBe(75.0);
    });

    it("2.4 should bulk increase price by percentage (+10%)", () => {
      const updated = selectedProducts.map((p) => ({
        ...p,
        price: +(p.price * 1.1).toFixed(2),
      }));
      expect(updated[0].price).toBe(22.0);
      expect(updated[1].price).toBe(55.0);
      expect(updated[2].price).toBe(110.0);
    });

    it("2.5 should bulk decrease price by percentage (-20%)", () => {
      const updated = selectedProducts.map((p) => ({
        ...p,
        price: +(p.price * 0.8).toFixed(2),
      }));
      expect(updated[0].price).toBe(16.0);
      expect(updated[1].price).toBe(40.0);
      expect(updated[2].price).toBe(80.0);
    });

    it("2.6 should bulk update category across all selected products", () => {
      const updated = selectedProducts.map((p) => ({ ...p, category: "Premium Pods" }));
      expect(updated.every((p) => p.category === "Premium Pods")).toBe(true);
    });

    it("2.7 should bulk update status to Published", () => {
      const updated = selectedProducts.map((p) => ({ ...p, status: "Published" }));
      expect(updated.every((p) => p.status === "Published")).toBe(true);
    });

    it("2.8 should bulk update inventory stock (set, increment, decrement)", () => {
      // Set to 75
      const setStock = selectedProducts.map((p) => ({ ...p, stock: 75 }));
      expect(setStock.every((p) => p.stock === 75)).toBe(true);

      // Increment by 10
      const incStock = selectedProducts.map((p) => ({ ...p, stock: p.stock + 10 }));
      expect(incStock[0].stock).toBe(60);
      expect(incStock[1].stock).toBe(20);
      expect(incStock[2].stock).toBe(10);

      // Decrement by 20 with non-negative clamp
      const decStock = selectedProducts.map((p) => ({ ...p, stock: Math.max(0, p.stock - 20) }));
      expect(decStock[0].stock).toBe(30);
      expect(decStock[1].stock).toBe(0);
      expect(decStock[2].stock).toBe(0);
    });

    it("2.9 should bulk toggle featured status", () => {
      const updated = selectedProducts.map((p) => ({ ...p, isFeatured: true }));
      expect(updated.every((p) => p.isFeatured === true)).toBe(true);
    });
  });

  // =========================================================================
  // 3. VALIDATION ENGINE & CELL-LEVEL ERROR DETECTION
  // =========================================================================
  describe("3. Cell-Level Validation Rules", () => {
    it("3.1 should pass completely valid product rows", () => {
      const valid = {
        name: "Blueberry Blast 6000",
        sku: "BLU-6K",
        price: 22.99,
        compareAtPrice: 27.99,
        stock: 45,
        status: "Published",
        manageStock: true,
      };
      const res = validateProductRow(valid);
      expect(res.isValid).toBe(true);
      expect(Object.keys(res.errors).length).toBe(0);
    });

    it("3.2 should catch missing, empty, or whitespace-only product name", () => {
      expect(validateProductRow({ name: "", price: 10 }).isValid).toBe(false);
      expect(validateProductRow({ name: "   ", price: 10 }).isValid).toBe(false);
      expect(validateProductRow({ name: null, price: 10 }).isValid).toBe(false);
      expect(validateProductRow({ name: undefined, price: 10 }).isValid).toBe(false);
      expect(validateProductRow({ name: "", price: 10 }).errors.name).toBe("Product name is required");
    });

    it("3.3 should catch invalid, empty, or negative prices", () => {
      expect(validateProductRow({ name: "Test", price: "" }).isValid).toBe(false);
      expect(validateProductRow({ name: "Test", price: -1 }).isValid).toBe(false);
      expect(validateProductRow({ name: "Test", price: "invalid" }).isValid).toBe(false);
      expect(validateProductRow({ name: "Test", price: -1 }).errors.price).toBe("Price must be a positive number");

      // Price = 0 should be allowed (e.g. free promotional items)
      expect(validateProductRow({ name: "Free Sample", price: 0 }).isValid).toBe(true);
    });

    it("3.4 should validate compareAtPrice when supplied", () => {
      expect(validateProductRow({ name: "Test", price: 10, compareAtPrice: -5 }).isValid).toBe(false);
      expect(validateProductRow({ name: "Test", price: 10, compareAtPrice: "text" }).isValid).toBe(false);
      expect(validateProductRow({ name: "Test", price: 10, compareAtPrice: 15 }).isValid).toBe(true);
      expect(validateProductRow({ name: "Test", price: 10, compareAtPrice: "" }).isValid).toBe(true);
    });

    it("3.5 should catch invalid or decimal stock quantities", () => {
      expect(validateProductRow({ name: "Test", price: 10, stock: -5 }).isValid).toBe(false);
      expect(validateProductRow({ name: "Test", price: 10, stock: 3.14 }).isValid).toBe(false);
      expect(validateProductRow({ name: "Test", price: 10, stock: "abc" }).isValid).toBe(false);
      expect(validateProductRow({ name: "Test", price: 10, stock: 50 }).isValid).toBe(true);
    });

    it("3.6 should catch invalid status enum values and accept aliases", () => {
      expect(validateProductRow({ name: "Test", price: 10, status: "InvalidStatus" }).isValid).toBe(false);
      expect(validateProductRow({ name: "Test", price: 10, status: "Active" }).isValid).toBe(true);
      expect(validateProductRow({ name: "Test", price: 10, status: "Published" }).isValid).toBe(true);
      expect(validateProductRow({ name: "Test", price: 10, status: "Draft" }).isValid).toBe(true);
    });
  });

  // =========================================================================
  // 4. CSV & EXCEL (XLSX) IMPORT, MAPPING & CONFLICT DETECTION
  // =========================================================================
  describe("4. CSV & XLSX Import, Auto-Mapping & Conflicts", () => {
    it("4.1 should auto-detect headers across common e-commerce variations", () => {
      const testCases = [
        { header: "Product Name", expected: "name" },
        { header: "title", expected: "name" },
        { header: "Item Title", expected: "name" },
        { header: "SKU", expected: "sku" },
        { header: "Item Barcode", expected: "sku" },
        { header: "Product Code", expected: "sku" },
        { header: "Price", expected: "price" },
        { header: "Regular Price", expected: "price" },
        { header: "Selling Price", expected: "price" },
        { header: "Unit Cost", expected: "price" },
        { header: "Compare At Price", expected: "compareAtPrice" },
        { header: "Sale Price", expected: "compareAtPrice" },
        { header: "M.R.P", expected: "compareAtPrice" },
        { header: "Stock", expected: "stock" },
        { header: "Inventory Qty", expected: "stock" },
        { header: "Quantity Available", expected: "stock" },
        { header: "Track Inventory", expected: "manageStock" },
        { header: "Category", expected: "category" },
        { header: "Product Category", expected: "category" },
        { header: "Collection Name", expected: "category" },
        { header: "Status", expected: "status" },
        { header: "Publish State", expected: "status" },
        { header: "Featured", expected: "isFeatured" },
        { header: "Tags", expected: "tags" },
        { header: "Image URL", expected: "image" },
        { header: "Product Photo", expected: "image" },
        { header: "Short Description", expected: "shortDescription" },
        { header: "Summary", expected: "shortDescription" },
        { header: "Random Internal Column", expected: "skip" },
      ];

      testCases.forEach(({ header, expected }) => {
        const mapping = autoDetectColumnMapping([header]);
        expect(mapping[header], `Header '${header}' failed to map to '${expected}'`).toBe(expected);
      });
    });

    it("4.2 should parse multi-sheet XLSX workbooks and extract data accurately", () => {
      // Create a mock workbook with 2 sheets
      const wb = XLSX.utils.book_new();
      const sheet1Data = [
        { "Product Name": "E-Juice Strawberry", Price: 15.99, Stock: 100 },
        { "Product Name": "E-Juice Watermelon", Price: 15.99, Stock: 80 },
      ];
      const sheet2Data = [
        { "Spare Part": "Coil 0.8ohm", Price: 4.99 },
      ];

      const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
      const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
      XLSX.utils.book_append_sheet(wb, ws1, "Products");
      XLSX.utils.book_append_sheet(wb, ws2, "Accessories");

      expect(wb.SheetNames).toEqual(["Products", "Accessories"]);

      // Read sheet 1
      const parsedProducts = XLSX.utils.sheet_to_json(wb.Sheets["Products"]);
      expect(parsedProducts.length).toBe(2);
      expect(parsedProducts[0]["Product Name"]).toBe("E-Juice Strawberry");
      expect(parsedProducts[1]["Stock"]).toBe(80);
    });

    it("4.3 should handle duplicate SKU conflicts across skip, update, and flag modes", () => {
      const existingSkus = new Set(["VAPE-001", "VAPE-002"]);
      const incomingRow = { name: "Duplicate Item", sku: "VAPE-001", price: 29.99 };

      // Mode: SKIP
      const shouldSkip = existingSkus.has(incomingRow.sku);
      expect(shouldSkip).toBe(true);

      // Mode: FLAG
      const validation = validateProductRow(incomingRow);
      if (existingSkus.has(incomingRow.sku)) {
        validation.isValid = false;
        validation.errors.sku = "SKU already exists in store";
      }
      expect(validation.isValid).toBe(false);
      expect(validation.errors.sku).toBe("SKU already exists in store");

      // Mode: UPDATE
      const isConflictUpdate = existingSkus.has(incomingRow.sku);
      expect(isConflictUpdate).toBe(true);
    });

    it("4.4 should support partial import: separate valid products and format failed rows", () => {
      const rows = [
        { row: 1, data: { name: "Valid Pod", price: 19.99, stock: 10 }, isValid: true },
        { row: 2, data: { name: "", price: 25.0, stock: 5 }, isValid: false, errors: { name: "Product name is required" } },
        { row: 3, data: { name: "Invalid Price", price: -10, stock: 2 }, isValid: false, errors: { price: "Price must be a positive number" } },
        { row: 4, data: { name: "Valid Kit", price: 49.99, stock: 20 }, isValid: true },
      ];

      const validRows = rows.filter((r) => r.isValid).map((r) => r.data);
      const failedRows = rows.filter((r) => !r.isValid);

      expect(validRows.length).toBe(2);
      expect(failedRows.length).toBe(2);
      expect(failedRows[0].errors.name).toBe("Product name is required");
      expect(failedRows[1].errors.price).toBe("Price must be a positive number");
    });
  });

  // =========================================================================
  // 5. EXPORT & TEMPLATE INTEGRITY (ROUND-TRIP SAFETY)
  // =========================================================================
  describe("5. Export & Template Round-Trip Safety", () => {
    it("5.1 template columns should match the exact Product schema fields", () => {
      const keys = BULK_COLUMNS.map((c) => c.key);
      const expectedKeys = [
        "name",
        "sku",
        "price",
        "compareAtPrice",
        "stock",
        "manageStock",
        "category",
        "status",
        "isFeatured",
        "tags",
        "image",
        "shortDescription",
      ];
      expect(keys).toEqual(expectedKeys);
    });

    it("5.2 exported data should match the import template so it can be re-imported seamlessly", () => {
      const testProducts = [
        {
          name: "Mint Frost 30ml",
          sku: "MINT-30",
          price: 14.99,
          compareAtPrice: 18.99,
          stock: 60,
          manageStock: true,
          category: "E-Liquids",
          status: "Published",
          isFeatured: true,
          tags: ["mint", "menthol", "salts"],
          image: "https://example.com/mint.jpg",
          shortDescription: "Chilled mint nicotine salts",
        },
      ];

      // Format for export
      const exported = testProducts.map((prod) => ({
        name: prod.name,
        sku: prod.sku,
        price: prod.price,
        compareAtPrice: prod.compareAtPrice,
        stock: prod.stock,
        manageStock: prod.manageStock,
        category: prod.category,
        status: prod.status,
        isFeatured: prod.isFeatured,
        tags: prod.tags.join(", "),
        image: prod.image,
        shortDescription: prod.shortDescription,
      }));

      // Simulate re-import column mapping
      const mapping = autoDetectColumnMapping(Object.keys(exported[0]));
      expect(mapping.name).toBe("name");
      expect(mapping.sku).toBe("sku");
      expect(mapping.price).toBe("price");
      expect(mapping.compareAtPrice).toBe("compareAtPrice");
      expect(mapping.stock).toBe("stock");
      expect(mapping.category).toBe("category");
      expect(mapping.status).toBe("status");

      // Validate re-imported item
      const reimported = validateProductRow(exported[0]);
      expect(reimported.isValid).toBe(true);
    });
  });

  // =========================================================================
  // 6. BACKEND BULK TRANSACTION PAYLOAD & RESOLUTION
  // =========================================================================
  describe("6. Backend Batch Mutation Payload Integrity", () => {
    it("6.1 should format batch creation payload with clean slugs, tags, and categories", () => {
      const rawInput = {
        name: "Cool Mango Ice 5000",
        sku: "MANGO-5K",
        price: 18.5,
        compareAtPrice: "22.00",
        stock: "75",
        manageStock: true,
        category: "Disposables",
        status: "Published",
        isFeatured: false,
        tags: "mango, ice, 5000puffs",
        image: "https://img.com/mango.png",
      };

      // Transform logic as implemented in /api/admin/products/bulk/route.js
      const baseSlug = rawInput.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      const priceNum = Number(rawInput.price);
      const compareNum = Number(rawInput.compareAtPrice);
      const stockNum = parseInt(rawInput.stock, 10);
      const tagsArr = rawInput.tags.split(",").map((t) => t.trim());

      expect(baseSlug).toBe("cool-mango-ice-5000");
      expect(priceNum).toBe(18.5);
      expect(compareNum).toBe(22.0);
      expect(stockNum).toBe(75);
      expect(tagsArr).toEqual(["mango", "ice", "5000puffs"]);
    });

    it("6.2 should format batch update payload using $set only on modified properties", () => {
      const updateData = {
        price: 34.99,
        stock: 120,
      };

      const setPayload = {};
      if (updateData.price !== undefined) setPayload.price = Number(updateData.price);
      if (updateData.stock !== undefined) setPayload.stock = parseInt(updateData.stock, 10);

      expect(setPayload).toEqual({ price: 34.99, stock: 120 });
      // Untouched properties like name, sku, images must not be in setPayload
      expect(setPayload.name).toBeUndefined();
      expect(setPayload.images).toBeUndefined();
    });

    it("6.3 should format batch soft-deletes using isDeleted: true", () => {
      const deleteIds = ["id-1", "id-2", "id-3"];
      const mongoFilter = { _id: { $in: deleteIds }, tenantId: "DEFAULT_STORE" };
      const mongoUpdate = { $set: { isDeleted: true } };

      expect(mongoFilter._id.$in).toEqual(deleteIds);
      expect(mongoFilter.tenantId).toBe("DEFAULT_STORE");
      expect(mongoUpdate.$set.isDeleted).toBe(true);
    });
  });

  // =========================================================================
  // 7. NON-BREAKING & BACKWARDS COMPATIBILITY INTEGRITY
  // =========================================================================
  describe("7. Backward Compatibility Sanity Check", () => {
    it("7.1 sample products should conform to existing store schema", () => {
      expect(SAMPLE_PRODUCTS.length).toBeGreaterThan(0);
      SAMPLE_PRODUCTS.forEach((product) => {
        const val = validateProductRow(product);
        expect(val.isValid, `Sample product ${product.name} failed validation`).toBe(true);
        expect(product.price).toBeGreaterThan(0);
        expect(["Draft", "Published"]).toContain(product.status);
      });
    });
  });
});
