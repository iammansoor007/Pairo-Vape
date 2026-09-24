"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Save,
  Download,
  Upload,
  MoreVertical,
  AlertCircle,
  Check,
  Loader2,
  FileSpreadsheet,
  ChevronDown,
  ExternalLink,
  Layers,
  ArrowLeft,
  X,
} from "lucide-react";
import AdminPageLayout from "@/components/admin/AdminPageLayout";
import ColumnSelector from "@/components/admin/bulk/ColumnSelector";
import BulkActionsModal from "@/components/admin/bulk/BulkActionsModal";
import SaveConfirmationModal from "@/components/admin/bulk/SaveConfirmationModal";
import BulkImportModal from "@/components/admin/bulk/BulkImportModal";
import {
  BULK_COLUMNS,
  DEFAULT_PRODUCT_ROW,
  validateProductRow,
  exportProducts,
  downloadCsvTemplate,
  downloadXlsxTemplate,
  sanitizePrice,
  sanitizeStock,
  normalizeStatus,
} from "@/lib/bulkProductUtils";
import toast, { Toaster } from "react-hot-toast";

function BulkProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedIds = searchParams.get("ids");

  // Main state
  const [rows, setRows] = useState([]);
  const [originalRows, setOriginalRows] = useState(new Map());
  const [deletedIds, setDeletedIds] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState([
    "name",
    "sku",
    "price",
    "compareAtPrice",
    "stock",
    "category",
    "status",
  ]);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkActionsModalOpen, setIsBulkActionsModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Row action menu dropdown
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  // Fetch initial products and categories
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/admin/products/bulk";
      if (preselectedIds) {
        url += `?ids=${encodeURIComponent(preselectedIds)}`;
      }
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        const prodList = (data.products || []).map((p) => ({
          ...p,
          _rowId: p._id,
          isNew: false,
        }));

        setRows(prodList);
        setCategories(data.categories || []);

        // Store snapshot of originals for dirty checking
        const originalMap = new Map();
        prodList.forEach((p) => {
          originalMap.set(p._id, JSON.stringify(p));
        });
        setOriginalRows(originalMap);
      } else {
        toast.error(data.error || "Failed to load products");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [preselectedIds]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchData();
    });
  }, [fetchData]);

  // Close row action menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute dirty items
  const dirtyItems = useMemo(() => {
    const modified = [];
    const created = [];

    rows.forEach((row) => {
      if (row.isNew) {
        // Only count if has at least a name or price
        if (row.name?.trim() || row.price !== "") {
          created.push(row);
        }
      } else {
        const origStr = originalRows.get(row._rowId);
        if (origStr && origStr !== JSON.stringify(row)) {
          modified.push(row);
        }
      }
    });

    return {
      modified,
      created,
      deletes: Array.from(deletedIds),
      totalCount: modified.length + created.length + deletedIds.size,
    };
  }, [rows, originalRows, deletedIds]);

  // Warn user before leaving if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (dirtyItems.totalCount > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirtyItems.totalCount]);

  // Set of existing SKUs for duplicate detection during import
  const existingSkusSet = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      if (r.sku?.trim()) set.add(r.sku.trim());
    });
    return set;
  }, [rows]);

  // Filter products for spreadsheet view
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Don't show deleted existing products in the active grid
      if (deletedIds.has(row._rowId)) return false;

      const matchesSearch =
        !searchTerm ||
        row.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.sku?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        categoryFilter === "All" || row.category === categoryFilter;

      const matchesStatus =
        statusFilter === "All" || row.status === statusFilter;

      let matchesStock = true;
      if (stockFilter === "In stock") {
        matchesStock = Number(row.stock) > 2;
      } else if (stockFilter === "Low stock") {
        matchesStock = Number(row.stock) > 0 && Number(row.stock) <= 2;
      } else if (stockFilter === "Out of stock") {
        matchesStock = Number(row.stock) <= 0;
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesStock;
    });
  }, [rows, deletedIds, searchTerm, categoryFilter, statusFilter, stockFilter]);

  // Cell change handler
  const handleCellChange = (rowId, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row._rowId === rowId) {
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  // Cell blur handler with automatic sanitization
  const handleCellBlur = (rowId, field, value) => {
    let cleaned = value;
    if (field === "price" || field === "compareAtPrice") {
      cleaned = sanitizePrice(value);
    } else if (field === "stock") {
      cleaned = sanitizeStock(value);
    }
    handleCellChange(rowId, field, cleaned);
  };

  // Clipboard Tabular Paste (Excel, Google Sheets TSV)
  const handleTablePaste = (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;
    const pastedText = clipboardData.getData("text");
    if (!pastedText) return;

    // Detect if this is tabular data (contains tabs or newlines)
    const hasTabs = pastedText.includes("\t");
    const hasNewlines = pastedText.includes("\n");

    if (!hasTabs && !hasNewlines) {
      // Normal single input paste, let browser default run
      return;
    }

    e.preventDefault();

    const lines = pastedText
      .split(/\r\n|\r|\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const parsedRows = lines.map((line) => line.split("\t").map((c) => c.trim()));
    const activeCols = BULK_COLUMNS.filter((col) => visibleColumns.includes(col.key));

    const newRows = parsedRows.map((cells, rowIdx) => {
      const rowObj = {
        ...DEFAULT_PRODUCT_ROW,
        _rowId: `new-${Date.now()}-${rowIdx}-${Math.random().toString(36).substring(2, 6)}`,
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
        } else if (key === "manageStock" || key === "isFeatured") {
          rowObj[key] = val.toLowerCase() === "true" || val === "1" || val.toLowerCase() === "yes";
        } else {
          rowObj[key] = val;
        }
      });

      return rowObj;
    });

    setRows((prev) => [...prev, ...newRows]);
    toast.success(`Pasted ${newRows.length} product(s) from spreadsheet!`);
  };

  // Add Row(s)
  const addRows = (count = 1) => {
    const newItems = Array.from({ length: count }, (_, idx) => ({
      ...DEFAULT_PRODUCT_ROW,
      _rowId: `new-${Date.now()}-${idx}`,
      isNew: true,
    }));
    setRows((prev) => [...prev, ...newItems]);
    toast.success(`Added ${count} new product row(s)`);
  };

  // Row Action: Duplicate Row
  const handleDuplicateRow = (rowId) => {
    const index = rows.findIndex((r) => r._rowId === rowId);
    if (index === -1) return;

    const source = rows[index];
    const duplicated = {
      ...source,
      _rowId: `new-${Date.now()}`,
      isNew: true,
      name: `${source.name} (Copy)`,
      sku: source.sku ? `${source.sku}-COPY` : "",
      slug: "",
    };

    const newRows = [...rows];
    newRows.splice(index + 1, 0, duplicated);
    setRows(newRows);
    setActiveMenuId(null);
    toast.success("Row duplicated");
  };

  // Row Action: Delete Row
  const handleDeleteRow = (rowId) => {
    const row = rows.find((r) => r._rowId === rowId);
    if (!row) return;

    if (row.isNew) {
      setRows((prev) => prev.filter((r) => r._rowId !== rowId));
      setSelectedIds((prev) => prev.filter((id) => id !== rowId));
    } else {
      setDeletedIds((prev) => new Set([...prev, rowId]));
      setSelectedIds((prev) => prev.filter((id) => id !== rowId));
    }
    setActiveMenuId(null);
    toast.success("Row marked for removal");
  };

  // Row Action: Insert Row Above / Below
  const handleInsertRow = (rowId, position = "below") => {
    const index = rows.findIndex((r) => r._rowId === rowId);
    if (index === -1) return;

    const newRow = {
      ...DEFAULT_PRODUCT_ROW,
      _rowId: `new-${Date.now()}`,
      isNew: true,
    };

    const newRows = [...rows];
    const insertIndex = position === "above" ? index : index + 1;
    newRows.splice(insertIndex, 0, newRow);
    setRows(newRows);
    setActiveMenuId(null);
  };

  // Row Action: Revert / Reset Row Changes
  const handleResetRow = (rowId) => {
    const row = rows.find((r) => r._rowId === rowId);
    if (!row) return;

    if (row.isNew) {
      setRows((prev) => prev.filter((r) => r._rowId !== rowId));
    } else {
      const origStr = originalRows.get(rowId);
      if (origStr) {
        const orig = JSON.parse(origStr);
        setRows((prev) => prev.map((r) => (r._rowId === rowId ? { ...orig } : r)));
      }
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
    }
    setActiveMenuId(null);
    toast.success("Row reverted to original state");
  };

  // Selection handlers
  const toggleSelectRow = (rowId) => {
    setSelectedIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (selectedIds.length === filteredRows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRows.map((r) => r._rowId));
    }
  };

  // Bulk action on selected rows
  const handleBulkActionApply = (action) => {
    if (selectedIds.length === 0) return;

    setRows((prev) =>
      prev.map((row) => {
        if (!selectedIds.includes(row._rowId)) return row;

        const updated = { ...row };

        if (action.type === "price") {
          const current = parseFloat(row.price) || 0;
          if (action.mode === "set") {
            updated.price = action.value;
          } else if (action.mode === "inc_amount") {
            updated.price = +(current + action.value).toFixed(2);
          } else if (action.mode === "dec_amount") {
            updated.price = Math.max(0, +(current - action.value).toFixed(2));
          } else if (action.mode === "inc_percent") {
            updated.price = +(current * (1 + action.value / 100)).toFixed(2);
          } else if (action.mode === "dec_percent") {
            updated.price = Math.max(0, +(current * (1 - action.value / 100)).toFixed(2));
          }
        } else if (action.type === "category") {
          updated.category = action.value;
        } else if (action.type === "status") {
          updated.status = action.value;
        } else if (action.type === "stock") {
          const currentStock = parseInt(row.stock, 10) || 0;
          if (action.mode === "set") {
            updated.stock = action.value;
          } else if (action.mode === "inc") {
            updated.stock = currentStock + action.value;
          } else if (action.mode === "dec") {
            updated.stock = Math.max(0, currentStock - action.value);
          }
        } else if (action.type === "featured") {
          updated.isFeatured = action.value;
        }

        return updated;
      })
    );

    toast.success(`Updated ${selectedIds.length} product(s)`);
  };

  // Bulk Delete Selected
  const handleDeleteSelected = () => {
    if (!confirm(`Remove ${selectedIds.length} selected product(s)?`)) return;

    selectedIds.forEach((id) => {
      const row = rows.find((r) => r._rowId === id);
      if (row?.isNew) {
        setRows((prev) => prev.filter((r) => r._rowId !== id));
      } else {
        setDeletedIds((prev) => new Set([...prev, id]));
      }
    });

    setSelectedIds([]);
    toast.success("Selected rows marked for removal");
  };

  // Bulk Duplicate Selected
  const handleDuplicateSelected = () => {
    const selectedRows = rows.filter((r) => selectedIds.includes(r._rowId));
    const duplicated = selectedRows.map((source, idx) => ({
      ...source,
      _rowId: `new-${Date.now()}-${idx}`,
      isNew: true,
      name: `${source.name} (Copy)`,
      sku: source.sku ? `${source.sku}-COPY` : "",
      slug: "",
    }));

    setRows((prev) => [...prev, ...duplicated]);
    toast.success(`Duplicated ${duplicated.length} products`);
  };

  // Import completion handler
  const handleImportComplete = (importedProducts = []) => {
    setRows((prev) => {
      const updated = [...prev];
      const newItems = [];

      importedProducts.forEach((p, idx) => {
        const skuTrimmed = p.sku ? String(p.sku).trim().toLowerCase() : "";
        const existingIdx = skuTrimmed
          ? updated.findIndex(
              (r) => !deletedIds.has(r._rowId) && r.sku && String(r.sku).trim().toLowerCase() === skuTrimmed
            )
          : -1;

        if (existingIdx !== -1 && p.isConflictUpdate) {
          // Merge updates into existing product row
          const existingRow = updated[existingIdx];
          updated[existingIdx] = {
            ...existingRow,
            ...p,
            _rowId: existingRow._rowId,
            _id: existingRow._id,
            isNew: existingRow.isNew,
          };
        } else {
          // Append as new product row
          newItems.push({
            ...DEFAULT_PRODUCT_ROW,
            ...p,
            _rowId: `new-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            isNew: true,
          });
        }
      });

      return [...updated, ...newItems];
    });

    toast.success(`Processed ${importedProducts.length} imported product(s). Remember to click Save Changes.`);
  };

  // Discard all changes
  const handleDiscardAll = () => {
    if (!confirm("Discard all unsaved changes and reload original data?")) return;
    fetchData();
    setDeletedIds(new Set());
    setSelectedIds([]);
    toast.success("Changes discarded");
  };

  // Batch Save to Server
  const handleSaveAllChanges = async () => {
    // 1. Validate all created and modified rows
    const validationErrors = [];

    dirtyItems.created.forEach((row, i) => {
      const val = validateProductRow(row);
      if (!val.isValid) {
        validationErrors.push(`New row "${row.name || 'Untitled'}": ${Object.values(val.errors).join(', ')}`);
      }
    });

    dirtyItems.modified.forEach((row) => {
      const val = validateProductRow(row);
      if (!val.isValid) {
        validationErrors.push(`Product "${row.name}": ${Object.values(val.errors).join(', ')}`);
      }
    });

    if (validationErrors.length > 0) {
      toast.error(`Please fix ${validationErrors.length} validation errors before saving.`);
      setIsSaveModalOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        creates: dirtyItems.created.map((row) => {
          const { _rowId, isNew, _id, ...rest } = row;
          return rest;
        }),
        updates: dirtyItems.modified.map((row) => {
          const { _rowId, isNew, _id, ...rest } = row;
          const origStr = originalRows.get(row._rowId);
          const orig = origStr ? JSON.parse(origStr) : {};
          const changedData = {};
          Object.keys(rest).forEach((k) => {
            if (JSON.stringify(rest[k]) !== JSON.stringify(orig[k])) {
              changedData[k] = rest[k];
            }
          });
          return { id: row._id, data: changedData };
        }),
        deletes: dirtyItems.deletes,
      };

      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        if (result.errors && result.errors.length > 0) {
          const errMsg = result.errors.map((e) => e.message || `Row error`).join("; ");
          toast.error(`Saved with warnings: ${errMsg}`, { duration: 6000 });
        } else {
          toast.success(
            `Bulk save completed: +${result.createdCount} created, ${result.updatedCount} updated, -${result.deletedCount} deleted`
          );
        }
        setIsSaveModalOpen(false);
        fetchData();
        setDeletedIds(new Set());
        setSelectedIds([]);
      } else {
        toast.error(result.error || "Some items failed to save");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to commit batch changes");
    } finally {
      setIsSaving(false);
    }
  };

  // Export handlers
  const handleExport = (format) => {
    let toExport = filteredRows;
    let label = "all";

    if (selectedIds.length > 0) {
      toExport = rows.filter((r) => selectedIds.includes(r._rowId));
      label = "selected";
    }

    exportProducts(toExport, format, `products_${label}_${Date.now()}`);
    toast.success(`Exported ${toExport.length} product(s) to ${format.toUpperCase()}`);
  };

  return (
    <AdminPageLayout
      title="Bulk Product Management"
      subtitle="Shopify-style spreadsheet editor for mass adding, updating, and importing products."
      breadcrumbs={[
        { label: "Products", href: "/admin/products" },
        { label: "Bulk Editor" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#2c3338] bg-white border border-[#ccd0d4] rounded-[3px] shadow-sm hover:bg-[#f6f7f7]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Standard View
          </Link>
        </div>
      }
    >
      <Toaster position="top-right" />

      <div className="space-y-4">

        {/* TOP STATUS & SAVE BAR (Persistent when dirty) */}
        {dirtyItems.totalCount > 0 && (
          <div className="bg-[#fff8e5] border border-[#f0b849] p-3 rounded-[4px] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3 text-[13px] text-[#855a00]">
              <span className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-[#d63638]" />
                Unsaved Changes ({dirtyItems.totalCount}):
              </span>
              <div className="flex items-center gap-2 text-[12px]">
                {dirtyItems.created.length > 0 && (
                  <span className="bg-white/80 px-2 py-0.5 rounded border border-[#f0b849]/50 font-semibold text-[#00a32a]">
                    +{dirtyItems.created.length} new
                  </span>
                )}
                {dirtyItems.modified.length > 0 && (
                  <span className="bg-white/80 px-2 py-0.5 rounded border border-[#f0b849]/50 font-semibold text-[#2271b1]">
                    {dirtyItems.modified.length} modified
                  </span>
                )}
                {dirtyItems.deletes.length > 0 && (
                  <span className="bg-white/80 px-2 py-0.5 rounded border border-[#f0b849]/50 font-semibold text-[#d63638]">
                    -{dirtyItems.deletes.length} deleted
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDiscardAll}
                className="px-3 py-1 text-[12px] font-medium text-[#646970] bg-white border border-[#ccd0d4] rounded hover:bg-[#eaeaea] cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-bold text-white bg-[#00a32a] hover:bg-[#008a20] rounded-[3px] shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Save Changes ({dirtyItems.totalCount})
              </button>
            </div>
          </div>
        )}

        {/* TOOLBAR */}
        <div className="bg-white border border-[#ccd0d4] p-3 rounded-[4px] shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 font-sans">
          
          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-[#646970] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search name, SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-[#8c8f94] rounded-[3px] focus:border-[#2271b1] outline-none"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-[12px] px-2 py-1.5 border border-[#8c8f94] rounded-[3px] bg-white outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-[12px] px-2 py-1.5 border border-[#8c8f94] rounded-[3px] bg-white outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="text-[12px] px-2 py-1.5 border border-[#8c8f94] rounded-[3px] bg-white outline-none cursor-pointer"
            >
              <option value="All">All Stock Levels</option>
              <option value="In stock">In Stock</option>
              <option value="Low stock">Low Stock (&le; 2)</option>
              <option value="Out of stock">Out of Stock</option>
            </select>
          </div>

          {/* Action Buttons: Import, Export, Columns, Templates */}
          <div className="flex flex-wrap items-center gap-2">
            <ColumnSelector
              visibleColumns={visibleColumns}
              setVisibleColumns={setVisibleColumns}
            />

            {/* Import Button */}
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold text-white bg-[#2271b1] hover:bg-[#135e96] rounded-[3px] shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Import CSV / Excel
            </button>

            {/* Export Dropdown */}
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 px-3 py-1.5 text-[13px] font-medium text-[#2c3338] bg-white border border-[#ccd0d4] rounded-[3px] hover:bg-[#f6f7f7] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#646970]" />
                Export
                <ChevronDown className="w-3 h-3 text-[#646970]" />
              </button>
              <div className="absolute right-0 mt-1 w-44 bg-white border border-[#ccd0d4] rounded-[3px] shadow-lg hidden group-hover:block z-50 p-1 text-[12px]">
                <button
                  type="button"
                  onClick={() => handleExport("csv")}
                  className="w-full text-left px-3 py-1.5 rounded hover:bg-[#f0f6fb] hover:text-[#2271b1]"
                >
                  Export as CSV (.csv)
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("xlsx")}
                  className="w-full text-left px-3 py-1.5 rounded hover:bg-[#f0f6fb] hover:text-[#2271b1]"
                >
                  Export as Excel (.xlsx)
                </button>
                <div className="my-1 border-t border-[#f0f0f1]" />
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="w-full text-left px-3 py-1.5 rounded text-[#646970] hover:bg-[#f0f6fb]"
                >
                  Download CSV Template
                </button>
                <button
                  type="button"
                  onClick={downloadXlsxTemplate}
                  className="w-full text-left px-3 py-1.5 rounded text-[#646970] hover:bg-[#f0f6fb]"
                >
                  Download Excel Template
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* MULTI-SELECT FLOATING ACTION BAR */}
        {selectedIds.length > 0 && (
          <div className="bg-[#1d2327] text-white p-2.5 px-4 rounded-[4px] shadow-md flex items-center justify-between text-[13px] animate-in fade-in duration-150 font-sans">
            <div className="flex items-center gap-3">
              <span className="font-bold text-[#f0b849]">
                {selectedIds.length} row(s) selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-[12px] text-[#c3c4c7] hover:text-white underline cursor-pointer"
              >
                Clear selection
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBulkActionsModalOpen(true)}
                className="px-3 py-1 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold rounded-[3px] text-[12px] cursor-pointer"
              >
                Bulk Edit Selected ▼
              </button>
              <button
                type="button"
                onClick={handleDuplicateSelected}
                className="px-2.5 py-1 bg-[#3c434a] hover:bg-[#50575e] text-white rounded-[3px] text-[12px] flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                Duplicate
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="px-2.5 py-1 bg-[#d63638] hover:bg-[#b32d2e] text-white font-medium rounded-[3px] text-[12px] flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        )}

        {/* SPREADSHEET GRID TABLE */}
        <div className="bg-white border border-[#ccd0d4] rounded-[4px] shadow-xs overflow-hidden font-sans">
          
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-[#646970] gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#2271b1]" />
              <span className="text-[14px]">Loading product spreadsheet...</span>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[650px] overflow-y-auto" onPaste={handleTablePaste}>
              <table className="w-full text-left border-collapse text-[12px]">
                
                {/* STICKY HEADER */}
                <thead className="bg-[#f6f7f7] border-b border-[#ccd0d4] text-[#1d2327] font-bold sticky top-0 z-20 select-none shadow-xs">
                  <tr>
                    <th className="w-10 py-2.5 px-3 text-center border-r border-[#e0e0e0]">
                      <input
                        type="checkbox"
                        checked={
                          filteredRows.length > 0 &&
                          selectedIds.length === filteredRows.length
                        }
                        onChange={toggleSelectAllFiltered}
                        className="rounded border-[#8c8f94] text-[#2271b1] focus:ring-0 cursor-pointer"
                      />
                    </th>

                    <th className="w-12 py-2.5 px-2 text-center text-[#646970] border-r border-[#e0e0e0]">
                      #
                    </th>

                    {/* DYNAMIC COLUMNS */}
                    {BULK_COLUMNS.filter((col) => visibleColumns.includes(col.key)).map((col) => (
                      <th
                        key={col.key}
                        className={`py-2.5 px-3 border-r border-[#e0e0e0] font-bold ${col.width}`}
                      >
                        <div className="flex items-center justify-between">
                          <span>
                            {col.label} {col.required && <span className="text-[#d63638]">*</span>}
                          </span>
                        </div>
                      </th>
                    ))}

                    <th className="w-16 py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>

                {/* SPREADSHEET BODY */}
                <tbody className="divide-y divide-[#e5e5e5]">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={visibleColumns.length + 3}
                        className="py-12 text-center text-[#646970]"
                      >
                        No products match current filters. Click{" "}
                        <button
                          type="button"
                          onClick={() => addRows(1)}
                          className="text-[#2271b1] font-bold hover:underline"
                        >
                          + Add Row
                        </button>{" "}
                        or import a CSV file.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, index) => {
                      const isSelected = selectedIds.includes(row._rowId);
                      const origStr = originalRows.get(row._rowId);
                      const isDirty = row.isNew || (origStr && origStr !== JSON.stringify(row));
                      const isDeleted = deletedIds.has(row._rowId);

                      return (
                        <tr
                          key={row._rowId}
                          className={`hover:bg-[#f9fbfd] transition-colors ${
                            isSelected ? "bg-[#f0f6fb]" : isDirty ? "bg-[#fffdf7]" : ""
                          }`}
                        >
                          {/* Row Checkbox */}
                          <td className="py-1 px-3 text-center border-r border-[#f0f0f1]">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(row._rowId)}
                              className="rounded border-[#8c8f94] text-[#2271b1] focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Row Index */}
                          <td className="py-1 px-2 text-center text-[#646970] text-[11px] border-r border-[#f0f0f1] font-mono">
                            {row.isNew ? (
                              <span className="text-[#00a32a] font-bold">New</span>
                            ) : (
                              index + 1
                            )}
                          </td>

                          {/* PRODUCT NAME */}
                          {visibleColumns.includes("name") && (
                            <td className="p-1 border-r border-[#f0f0f1]">
                              <input
                                type="text"
                                value={row.name || ""}
                                placeholder="Product Name..."
                                onChange={(e) => handleCellChange(row._rowId, "name", e.target.value)}
                                className={`w-full px-2 py-1 text-[12px] bg-transparent border rounded-[2px] transition-all outline-none ${
                                  !row.name?.trim()
                                    ? "border-[#d63638] bg-white text-[#d63638]"
                                    : "border-transparent hover:border-[#ccd0d4] focus:border-[#2271b1] focus:bg-white"
                                }`}
                              />
                            </td>
                          )}

                          {/* SKU */}
                          {visibleColumns.includes("sku") && (
                            <td className="p-1 border-r border-[#f0f0f1]">
                              <input
                                type="text"
                                value={row.sku || ""}
                                placeholder="SKU-001"
                                onChange={(e) => handleCellChange(row._rowId, "sku", e.target.value)}
                                className="w-full px-2 py-1 text-[12px] font-mono bg-transparent border border-transparent hover:border-[#ccd0d4] focus:border-[#2271b1] focus:bg-white rounded-[2px] outline-none"
                              />
                            </td>
                          )}

                          {/* PRICE */}
                          {visibleColumns.includes("price") && (
                            <td className="p-1 border-r border-[#f0f0f1]">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={row.price !== undefined ? row.price : ""}
                                placeholder="0.00"
                                onChange={(e) => handleCellChange(row._rowId, "price", e.target.value)}
                                onBlur={(e) => handleCellBlur(row._rowId, "price", e.target.value)}
                                className={`w-full px-2 py-1 text-[12px] text-right font-medium bg-transparent border rounded-[2px] outline-none ${
                                  row.price === "" || isNaN(Number(row.price)) || Number(row.price) < 0
                                    ? "border-[#d63638] bg-white text-[#d63638]"
                                    : "border-transparent hover:border-[#ccd0d4] focus:border-[#2271b1] focus:bg-white"
                                }`}
                              />
                            </td>
                          )}

                          {/* COMPARE AT PRICE */}
                          {visibleColumns.includes("compareAtPrice") && (
                            <td className="p-1 border-r border-[#f0f0f1]">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={row.compareAtPrice !== undefined ? row.compareAtPrice : ""}
                                placeholder="0.00"
                                onChange={(e) => handleCellChange(row._rowId, "compareAtPrice", e.target.value)}
                                onBlur={(e) => handleCellBlur(row._rowId, "compareAtPrice", e.target.value)}
                                className="w-full px-2 py-1 text-[12px] text-right text-[#646970] bg-transparent border border-transparent hover:border-[#ccd0d4] focus:border-[#2271b1] focus:bg-white rounded-[2px] outline-none"
                              />
                            </td>
                          )}

                          {/* STOCK */}
                          {visibleColumns.includes("stock") && (
                            <td className="p-1 border-r border-[#f0f0f1]">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={row.stock !== undefined ? row.stock : 0}
                                onChange={(e) => handleCellChange(row._rowId, "stock", e.target.value)}
                                onBlur={(e) => handleCellBlur(row._rowId, "stock", e.target.value)}
                                className="w-full px-2 py-1 text-[12px] text-right font-medium bg-transparent border border-transparent hover:border-[#ccd0d4] focus:border-[#2271b1] focus:bg-white rounded-[2px] outline-none"
                              />
                            </td>
                          )}

                          {/* TRACK STOCK */}
                          {visibleColumns.includes("manageStock") && (
                            <td className="p-1 text-center border-r border-[#f0f0f1]">
                              <input
                                type="checkbox"
                                checked={row.manageStock !== false}
                                onChange={(e) => handleCellChange(row._rowId, "manageStock", e.target.checked)}
                                className="rounded border-[#8c8f94] text-[#2271b1] focus:ring-0 cursor-pointer"
                              />
                            </td>
                          )}

                          {/* CATEGORY */}
                          {visibleColumns.includes("category") && (
                            <td className="p-1 border-r border-[#f0f0f1]">
                              <select
                                value={row.category || ""}
                                onChange={(e) => handleCellChange(row._rowId, "category", e.target.value)}
                                className="w-full px-1.5 py-1 text-[12px] bg-transparent border border-transparent hover:border-[#ccd0d4] focus:border-[#2271b1] focus:bg-white rounded-[2px] outline-none cursor-pointer"
                              >
                                <option value="">-- No Category --</option>
                                {categories.map((c) => (
                                  <option key={c._id} value={c.name}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}

                          {/* STATUS */}
                          {visibleColumns.includes("status") && (
                            <td className="p-1 border-r border-[#f0f0f1]">
                              <select
                                value={row.status || "Draft"}
                                onChange={(e) => handleCellChange(row._rowId, "status", e.target.value)}
                                className={`w-full px-2 py-1 text-[12px] font-medium rounded-[2px] border border-transparent hover:border-[#ccd0d4] focus:border-[#2271b1] focus:bg-white outline-none cursor-pointer ${
                                  row.status === "Published" ? "text-[#00a32a]" : "text-[#b26b00]"
                                }`}
                              >
                                <option value="Published">Published</option>
                                <option value="Draft">Draft</option>
                              </select>
                            </td>
                          )}

                          {/* FEATURED */}
                          {visibleColumns.includes("isFeatured") && (
                            <td className="p-1 text-center border-r border-[#f0f0f1]">
                              <input
                                type="checkbox"
                                checked={Boolean(row.isFeatured)}
                                onChange={(e) => handleCellChange(row._rowId, "isFeatured", e.target.checked)}
                                className="rounded border-[#8c8f94] text-[#2271b1] focus:ring-0 cursor-pointer"
                              />
                            </td>
                          )}

                          {/* TAGS */}
                          {visibleColumns.includes("tags") && (
                            <td className="p-1 border-r border-[#f0f0f1]">
                              <input
                                type="text"
                                value={row.tags || ""}
                                placeholder="tag1, tag2..."
                                onChange={(e) => handleCellChange(row._rowId, "tags", e.target.value)}
                                className="w-full px-2 py-1 text-[12px] text-[#646970] bg-transparent border border-transparent hover:border-[#ccd0d4] focus:border-[#2271b1] focus:bg-white rounded-[2px] outline-none"
                              />
                            </td>
                          )}

                          {/* IMAGE URL */}
                          {visibleColumns.includes("image") && (
                            <td className="p-1 border-r border-[#f0f0f1]">
                              <div className="flex items-center gap-1.5">
                                {row.image ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={row.image}
                                    alt=""
                                    className="w-6 h-6 object-cover rounded shrink-0 border border-[#ccd0d4]"
                                    onError={(e) => (e.target.style.display = "none")}
                                  />
                                ) : null}
                                <input
                                  type="text"
                                  value={row.image || ""}
                                  placeholder="https://..."
                                  onChange={(e) => handleCellChange(row._rowId, "image", e.target.value)}
                                  className="w-full px-2 py-1 text-[11px] text-[#646970] bg-transparent border border-transparent hover:border-[#ccd0d4] focus:border-[#2271b1] focus:bg-white rounded-[2px] outline-none truncate"
                                />
                              </div>
                            </td>
                          )}

                          {/* SHORT DESCRIPTION */}
                          {visibleColumns.includes("shortDescription") && (
                            <td className="p-1 border-r border-[#f0f0f1]">
                              <input
                                type="text"
                                value={row.shortDescription || ""}
                                placeholder="Brief summary..."
                                onChange={(e) => handleCellChange(row._rowId, "shortDescription", e.target.value)}
                                className="w-full px-2 py-1 text-[12px] text-[#646970] bg-transparent border border-transparent hover:border-[#ccd0d4] focus:border-[#2271b1] focus:bg-white rounded-[2px] outline-none truncate"
                              />
                            </td>
                          )}

                          {/* ROW ACTIONS MENU */}
                          <td className="p-1 text-center relative">
                            <button
                              type="button"
                              onClick={() => setActiveMenuId(activeMenuId === row._rowId ? null : row._rowId)}
                              className="p-1 text-[#646970] hover:text-[#1d2327] hover:bg-[#eaeaea] rounded cursor-pointer"
                              title="Row Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMenuId === row._rowId && (
                              <div
                                ref={menuRef}
                                className="absolute right-2 top-8 w-44 bg-white border border-[#ccd0d4] rounded-[4px] shadow-xl z-50 p-1 text-[12px] text-left animate-in fade-in zoom-in-95 duration-100"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateRow(row._rowId)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#f0f6fb] text-[#2c3338] hover:text-[#2271b1] cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  Duplicate Row
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInsertRow(row._rowId, "above")}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#f0f6fb] text-[#2c3338] hover:text-[#2271b1] cursor-pointer"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                  Insert Above
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInsertRow(row._rowId, "below")}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#f0f6fb] text-[#2c3338] hover:text-[#2271b1] cursor-pointer"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                  Insert Below
                                </button>
                                {isDirty && (
                                  <button
                                    type="button"
                                    onClick={() => handleResetRow(row._rowId)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#f0f6fb] text-[#b26b00] cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Reset Changes
                                  </button>
                                )}
                                <div className="my-1 border-t border-[#f0f0f1]" />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(row._rowId)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#ffebe9] text-[#d63638] font-medium cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete Row
                                </button>
                              </div>
                            )}
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* BOTTOM ROW ADDITION CONTROLS */}
          <div className="p-3 bg-[#f6f7f7] border-t border-[#ccd0d4] flex flex-wrap items-center justify-between gap-3 text-[13px]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => addRows(1)}
                className="flex items-center gap-1.5 px-3 py-1.5 font-bold text-[#2271b1] bg-white border border-[#2271b1] hover:bg-[#f0f6fb] rounded-[3px] shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Row
              </button>
              <button
                type="button"
                onClick={() => addRows(5)}
                className="px-2.5 py-1.5 font-medium text-[#2c3338] bg-white border border-[#ccd0d4] hover:bg-[#eaeaea] rounded-[3px] cursor-pointer text-[12px]"
              >
                +5 Rows
              </button>
              <button
                type="button"
                onClick={() => addRows(10)}
                className="px-2.5 py-1.5 font-medium text-[#2c3338] bg-white border border-[#ccd0d4] hover:bg-[#eaeaea] rounded-[3px] cursor-pointer text-[12px]"
              >
                +10 Rows
              </button>
              <button
                type="button"
                onClick={() => addRows(50)}
                className="px-2.5 py-1.5 font-medium text-[#2c3338] bg-white border border-[#ccd0d4] hover:bg-[#eaeaea] rounded-[3px] cursor-pointer text-[12px]"
              >
                +50 Rows
              </button>
            </div>

            <div className="flex items-center gap-3 text-[12px] text-[#646970]">
              <span>
                Total Rows: <strong>{filteredRows.length}</strong>
              </span>
              {dirtyItems.totalCount > 0 && (
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-bold text-white bg-[#00a32a] hover:bg-[#008a20] rounded-[3px] shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save Changes ({dirtyItems.totalCount})
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* MODALS */}
      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
        existingSkus={existingSkusSet}
      />

      <BulkActionsModal
        isOpen={isBulkActionsModalOpen}
        onClose={() => setIsBulkActionsModalOpen(false)}
        selectedCount={selectedIds.length}
        categories={categories}
        onApply={handleBulkActionApply}
      />

      <SaveConfirmationModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onConfirm={handleSaveAllChanges}
        isSaving={isSaving}
        summary={{
          creates: dirtyItems.created.length,
          updates: dirtyItems.modified.length,
          deletes: dirtyItems.deletes.length,
        }}
      />
    </AdminPageLayout>
  );
}

export default function BulkProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center text-[#646970] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#2271b1]" />
          <span className="text-[14px]">Loading Bulk Product Manager...</span>
        </div>
      }
    >
      <BulkProductsContent />
    </Suspense>
  );
}
