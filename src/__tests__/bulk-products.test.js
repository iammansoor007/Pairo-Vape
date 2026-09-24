import { describe, it, expect } from "vitest";
import {
  validateProductRow,
  autoDetectColumnMapping,
  BULK_COLUMNS,
  DEFAULT_PRODUCT_ROW,
} from "@/lib/bulkProductUtils";

describe("Bulk Product Utilities & Validation", () => {
  it("should validate a correct product row", () => {
    const validRow = {
      name: "Pod Device 5000",
      price: 19.99,
      compareAtPrice: 24.99,
      stock: 50,
      status: "Published",
      category: "Disposables",
    };

    const res = validateProductRow(validRow);
    expect(res.isValid).toBe(true);
    expect(Object.keys(res.errors).length).toBe(0);
  });

  it("should fail validation if product name is missing or empty", () => {
    const missingName = {
      name: "   ",
      price: 15.0,
      stock: 10,
    };

    const res = validateProductRow(missingName);
    expect(res.isValid).toBe(false);
    expect(res.errors.name).toBeDefined();
  });

  it("should fail validation if price is invalid or negative", () => {
    const negPrice = {
      name: "Vape Pen",
      price: -5.0,
    };
    const resNeg = validateProductRow(negPrice);
    expect(resNeg.isValid).toBe(false);
    expect(resNeg.errors.price).toBeDefined();

    const textPrice = {
      name: "Vape Pen",
      price: "abc",
    };
    const resText = validateProductRow(textPrice);
    expect(resText.isValid).toBe(false);
    expect(resText.errors.price).toBeDefined();
  });

  it("should fail validation if stock is not a positive integer", () => {
    const decimalStock = {
      name: "Vape Pen",
      price: 20,
      stock: 4.5,
    };
    const resDec = validateProductRow(decimalStock);
    expect(resDec.isValid).toBe(false);
    expect(resDec.errors.stock).toBeDefined();
  });

  it("should accurately auto-detect column mappings for CSV/Excel headers", () => {
    const headers = [
      "Product Name",
      "Item SKU",
      "Selling Price",
      "Sale Price",
      "Inventory",
      "Category Name",
      "State",
      "Photo URL",
      "Random Non-Existent Column",
    ];

    const mapping = autoDetectColumnMapping(headers);

    expect(mapping["Product Name"]).toBe("name");
    expect(mapping["Item SKU"]).toBe("sku");
    expect(mapping["Selling Price"]).toBe("price");
    expect(mapping["Sale Price"]).toBe("compareAtPrice");
    expect(mapping["Inventory"]).toBe("stock");
    expect(mapping["Category Name"]).toBe("category");
    expect(mapping["State"]).toBe("status");
    expect(mapping["Photo URL"]).toBe("image");
    expect(mapping["Random Non-Existent Column"]).toBe("skip");
  });

  it("should have consistent bulk columns definition matching existing product fields", () => {
    const keys = BULK_COLUMNS.map((c) => c.key);
    expect(keys).toContain("name");
    expect(keys).toContain("sku");
    expect(keys).toContain("price");
    expect(keys).toContain("compareAtPrice");
    expect(keys).toContain("stock");
    expect(keys).toContain("category");
    expect(keys).toContain("status");
  });
});
