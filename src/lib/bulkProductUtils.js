import * as XLSX from "xlsx";

export const BULK_COLUMNS = [
  { key: "name", label: "Product Name", required: true, type: "text", width: "w-64", placeholder: "e.g. Puff Bar Plus" },
  { key: "sku", label: "SKU", required: false, type: "text", width: "w-36", placeholder: "e.g. VAPE-001" },
  { key: "price", label: "Price ($)", required: true, type: "number", width: "w-28", placeholder: "0.00" },
  { key: "compareAtPrice", label: "Compare Price ($)", required: false, type: "number", width: "w-28", placeholder: "0.00" },
  { key: "stock", label: "Stock", required: false, type: "number", width: "w-24", placeholder: "0" },
  { key: "manageStock", label: "Track Stock", required: false, type: "boolean", width: "w-24" },
  { key: "category", label: "Category", required: false, type: "select-category", width: "w-44" },
  { key: "status", label: "Status", required: false, type: "select-status", width: "w-32", options: ["Draft", "Published"] },
  { key: "isFeatured", label: "Featured", required: false, type: "boolean", width: "w-24" },
  { key: "tags", label: "Tags", required: false, type: "text", width: "w-48", placeholder: "fruit, menthol, 5%" },
  { key: "image", label: "Image URL", required: false, type: "image", width: "w-48", placeholder: "https://..." },
  { key: "shortDescription", label: "Short Description", required: false, type: "text", width: "w-64", placeholder: "Brief summary..." },
];

export const DEFAULT_PRODUCT_ROW = {
  name: "",
  sku: "",
  price: "",
  compareAtPrice: "",
  stock: 0,
  manageStock: true,
  category: "",
  status: "Draft",
  isFeatured: false,
  tags: "",
  image: "",
  shortDescription: "",
};

export const SAMPLE_PRODUCTS = [
  {
    name: "Classic Mint Disposable Vape 5000 Puffs",
    sku: "VAPE-MINT-5K",
    price: 19.99,
    compareAtPrice: 24.99,
    stock: 150,
    manageStock: true,
    category: "Disposables",
    status: "Published",
    isFeatured: true,
    tags: "mint, fresh, disposable, 50mg",
    image: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=500",
    shortDescription: "Crisp and invigorating mint flavor with 5000 smooth puffs.",
  },
  {
    name: "Blueberry Ice Refillable Pod Kit",
    sku: "KIT-BLUE-POD",
    price: 29.99,
    compareAtPrice: 34.99,
    stock: 80,
    manageStock: true,
    category: "Pod Systems",
    status: "Draft",
    isFeatured: false,
    tags: "blueberry, pod, starter kit",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500",
    shortDescription: "Sleek and portable pod kit with mesh coil technology.",
  },
];

/**
 * Sanitizes numeric price values, stripping currency symbols ($/€/£) and formatting commas.
 */
export function sanitizePrice(val) {
  if (val === "" || val === null || val === undefined) return "";
  if (typeof val === "number") return isNaN(val) ? NaN : val;
  const cleaned = String(val).replace(/[$€£¥₹\s,]/g, "").trim();
  if (cleaned === "") return "";
  const num = Number(cleaned);
  return isNaN(num) ? NaN : num;
}

/**
 * Sanitizes inventory stock values, stripping commas and validating whole integer.
 */
export function sanitizeStock(val) {
  if (val === "" || val === null || val === undefined) return 0;
  if (typeof val === "number") return Number.isInteger(val) ? val : NaN;
  const cleaned = String(val).replace(/[,\s]/g, "").trim();
  if (cleaned === "") return 0;
  const num = Number(cleaned);
  if (isNaN(num) || !Number.isInteger(num)) return NaN;
  return num;
}

/**
 * Normalizes status strings (accepts Shopify 'Active', 'Live', 'Published', 'Draft', 'Inactive').
 */
export function normalizeStatus(val) {
  if (!val) return "Draft";
  const s = String(val).toLowerCase().trim();
  if (["published", "active", "live", "publish"].includes(s)) return "Published";
  if (["draft", "inactive", "hidden", "archived"].includes(s)) return "Draft";
  return val;
}

/**
 * Validates a single product row.
 * Returns an object with { isValid: boolean, errors: { [field]: string } }
 */
export function validateProductRow(row) {
  const errors = {};

  if (!row.name || !String(row.name).trim()) {
    errors.name = "Product name is required";
  }

  if (row.price === "" || row.price === null || row.price === undefined) {
    errors.price = "Price is required";
  } else {
    const numPrice = sanitizePrice(row.price);
    if (isNaN(numPrice) || numPrice < 0) {
      errors.price = "Price must be a positive number";
    }
  }

  if (row.compareAtPrice !== "" && row.compareAtPrice !== null && row.compareAtPrice !== undefined) {
    const numCompare = sanitizePrice(row.compareAtPrice);
    if (isNaN(numCompare) || numCompare < 0) {
      errors.compareAtPrice = "Compare price must be a positive number";
    }
  }

  if (row.stock !== "" && row.stock !== null && row.stock !== undefined) {
    const numStock = sanitizeStock(row.stock);
    if (isNaN(numStock) || numStock < 0 || !Number.isInteger(numStock)) {
      errors.stock = "Stock must be a whole positive integer";
    }
  }

  const normStatus = normalizeStatus(row.status);
  if (normStatus && !["Draft", "Published"].includes(normStatus)) {
    errors.status = "Status must be either 'Draft' or 'Published'";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Heuristics to auto-map CSV / Excel headers to product fields.
 */
export function autoDetectColumnMapping(headers = []) {
  const mapping = {};

  const clean = (str) =>
    String(str || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  headers.forEach((header) => {
    const c = clean(header);

    if (c.includes("compare") || c.includes("saleprice") || c.includes("wasprice") || c.includes("mrp") || c.includes("originalprice")) {
      mapping[header] = "compareAtPrice";
    } else if (c.includes("price") || c.includes("cost") || c.includes("rate") || c.includes("selling")) {
      mapping[header] = "price";
    } else if (c.includes("managestock") || c.includes("trackstock") || c.includes("trackinventory")) {
      mapping[header] = "manageStock";
    } else if (c.includes("stock") || c.includes("inventory") || c.includes("qty") || c.includes("quantity")) {
      mapping[header] = "stock";
    } else if (c.includes("sku") || c.includes("barcode") || c.includes("upc") || c.includes("code")) {
      mapping[header] = "sku";
    } else if (c.includes("category") || c.includes("collection") || c.includes("group") || c.includes("department")) {
      mapping[header] = "category";
    } else if (c.includes("status") || c.includes("state") || c.includes("publish") || c.includes("visibility") || c === "live" || c === "active") {
      mapping[header] = "status";
    } else if (c.includes("featured") || c.includes("promote") || c.includes("highlight")) {
      mapping[header] = "isFeatured";
    } else if (c.includes("tag") || c.includes("keyword") || c.includes("label")) {
      mapping[header] = "tags";
    } else if (c.includes("photo") || c.includes("picture") || c.includes("image")) {
      mapping[header] = "image";
    } else if (c.includes("name") || c.includes("title") || c === "product" || c === "item") {
      mapping[header] = "name";
    } else if (c.includes("description") || c.includes("summary") || c.includes("excerpt") || c.includes("brief")) {
      mapping[header] = "shortDescription";
    } else {
      mapping[header] = "skip";
    }
  });

  return mapping;
}

/**
 * Trigger file download in browser
 */
function triggerBrowserDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download CSV template with sample rows
 */
export function downloadCsvTemplate() {
  const headers = BULK_COLUMNS.map((col) => col.key);
  const rows = SAMPLE_PRODUCTS.map((prod) =>
    headers.map((key) => {
      const val = prod[key] !== undefined ? prod[key] : "";
      return typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(",")
  );

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  triggerBrowserDownload(blob, "products_bulk_template.csv");
}

/**
 * Generate and download Excel (.xlsx) template with sample rows
 */
export function downloadXlsxTemplate() {
  const ws = XLSX.utils.json_to_sheet(SAMPLE_PRODUCTS);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  triggerBrowserDownload(blob, "products_bulk_template.xlsx");
}

/**
 * Export products to CSV or XLSX
 */
export function exportProducts(products = [], format = "csv", filename = "products_export") {
  const exportData = products.map((prod) => ({
    name: prod.name || "",
    sku: prod.sku || "",
    price: prod.price !== undefined && prod.price !== null ? prod.price : "",
    compareAtPrice: prod.compareAtPrice !== undefined && prod.compareAtPrice !== null ? prod.compareAtPrice : "",
    stock: prod.stock !== undefined && prod.stock !== null ? prod.stock : 0,
    manageStock: prod.manageStock ?? true,
    category: prod.category || (typeof prod.primaryCategory === "object" ? prod.primaryCategory?.name : "") || "",
    status: prod.status || "Draft",
    isFeatured: Boolean(prod.isFeatured),
    tags: Array.isArray(prod.tags) ? prod.tags.join(", ") : prod.tags || "",
    image: prod.image || (Array.isArray(prod.images) ? prod.images[0] : "") || "",
    shortDescription: prod.shortDescription || "",
  }));

  if (format === "xlsx") {
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    triggerBrowserDownload(blob, `${filename}.xlsx`);
  } else {
    const headers = Object.keys(exportData[0] || DEFAULT_PRODUCT_ROW);
    const rows = exportData.map((prod) =>
      headers
        .map((key) => {
          const val = prod[key] !== undefined && prod[key] !== null ? prod[key] : "";
          return typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r"))
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        })
        .join(",")
    );
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    triggerBrowserDownload(blob, `${filename}.csv`);
  }
}

/**
 * Download failed import rows as CSV with error reason
 */
export function downloadFailedRowsCsv(failedRows = []) {
  if (!failedRows.length) return;

  const exportData = failedRows.map((item) => ({
    ...item.row,
    error_reason: item.error || Object.values(item.errors || {}).join("; ") || "Invalid data",
  }));

  const headers = Object.keys(exportData[0]);
  const rows = exportData.map((row) =>
    headers
      .map((key) => {
        const val = row[key] !== undefined ? row[key] : "";
        return typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      })
      .join(",")
  );

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  triggerBrowserDownload(blob, "failed_import_rows.csv");
}
