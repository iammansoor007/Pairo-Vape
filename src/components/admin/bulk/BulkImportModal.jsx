"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  X,
  Upload,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Download,
  Check,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  BULK_COLUMNS,
  autoDetectColumnMapping,
  validateProductRow,
  sanitizePrice,
  sanitizeStock,
  normalizeStatus,
  downloadFailedRowsCsv,
  downloadCsvTemplate,
  downloadXlsxTemplate,
} from "@/lib/bulkProductUtils";

export default function BulkImportModal({
  isOpen,
  onClose,
  onImportComplete,
  existingSkus = new Set(),
}) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Mapping, 3: Preview
  const [file, setFile] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [rawWorkbook, setRawWorkbook] = useState(null);

  // Raw file data
  const [fileHeaders, setFileHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);

  // Column mapping: { [fileHeader]: productFieldKey }
  const [mapping, setMapping] = useState({});

  // Conflict mode: 'skip' | 'update' | 'flag'
  const [conflictMode, setConflictMode] = useState("skip");

  // Validated rows
  const [validatedData, setValidatedData] = useState([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, errors: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const resetState = () => {
    setStep(1);
    setFile(null);
    setSheets([]);
    setSelectedSheet("");
    setRawWorkbook(null);
    setFileHeaders([]);
    setRawRows([]);
    setMapping({});
    setValidatedData([]);
    setStats({ total: 0, valid: 0, errors: 0 });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // STEP 1: Handle File Selection
  const handleFileChange = async (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);

    try {
      const buffer = await uploadedFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      setRawWorkbook(wb);
      setSheets(wb.SheetNames);

      if (wb.SheetNames.length === 1) {
        setSelectedSheet(wb.SheetNames[0]);
        parseSheet(wb, wb.SheetNames[0]);
      } else {
        setSelectedSheet(wb.SheetNames[0]);
      }
    } catch (err) {
      console.error("Error reading file:", err);
      alert("Failed to parse file: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseSheet = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (!jsonData || jsonData.length === 0) {
      alert("Selected sheet is empty");
      return;
    }

    const headers = Object.keys(jsonData[0] || {});
    setFileHeaders(headers);
    setRawRows(jsonData);

    // Auto-detect column mapping
    const autoMap = autoDetectColumnMapping(headers);
    setMapping(autoMap);
    setStep(2);
  };

  const handleSheetConfirm = () => {
    if (rawWorkbook && selectedSheet) {
      parseSheet(rawWorkbook, selectedSheet);
    }
  };

  // STEP 2 -> 3: Process mapping & pre-validate
  const handleProceedToPreview = () => {
    setIsProcessing(true);

    setTimeout(() => {
      const seenFileSkus = new Set();
      const processed = rawRows.map((rawRow, index) => {
        const product = {};

        // Apply column mapping
        Object.entries(mapping).forEach(([fileCol, productKey]) => {
          if (productKey && productKey !== "skip") {
            product[productKey] = rawRow[fileCol];
          }
        });

        // Clean & sanitize numeric & status values
        if (product.price !== undefined && product.price !== "") {
          product.price = sanitizePrice(product.price);
        }
        if (product.compareAtPrice !== undefined && product.compareAtPrice !== "") {
          product.compareAtPrice = sanitizePrice(product.compareAtPrice);
        }
        if (product.stock !== undefined && product.stock !== "") {
          product.stock = sanitizeStock(product.stock);
        }
        product.status = normalizeStatus(product.status);
        product.manageStock = product.manageStock !== false && product.manageStock !== "false";
        product.isFeatured = product.isFeatured === true || product.isFeatured === "true" || product.isFeatured === 1;

        // Check SKU conflict with store database
        const skuTrimmed = product.sku ? String(product.sku).trim() : "";
        const isSkuConflict = Boolean(skuTrimmed && existingSkus.has(skuTrimmed));

        // Check duplicate SKU within the file itself
        let isFileDuplicateSku = false;
        if (skuTrimmed) {
          if (seenFileSkus.has(skuTrimmed.toLowerCase())) {
            isFileDuplicateSku = true;
          } else {
            seenFileSkus.add(skuTrimmed.toLowerCase());
          }
        }

        // Validate
        const val = validateProductRow(product);
        if (isSkuConflict && conflictMode === "flag") {
          val.isValid = false;
          val.errors.sku = "SKU already exists in store";
        }
        if (isFileDuplicateSku) {
          val.isValid = false;
          val.errors.sku = "Duplicate SKU found within this file";
        }

        return {
          id: `import-${index}`,
          rowNumber: index + 2, // 1-based + 1 for header
          raw: rawRow,
          product,
          isSkuConflict,
          isValid: val.isValid,
          errors: val.errors,
        };
      });

      const validCount = processed.filter((p) => p.isValid).length;
      const errorCount = processed.length - validCount;

      setValidatedData(processed);
      setStats({
        total: processed.length,
        valid: validCount,
        errors: errorCount,
      });

      setIsProcessing(false);
      setStep(3);
    }, 100);
  };

  // Inline correction in Preview table
  const handleCellEditInPreview = (rowIndex, field, value) => {
    setValidatedData((prev) => {
      const copy = [...prev];
      const item = { ...copy[rowIndex] };
      item.product = { ...item.product, [field]: value };

      // Re-validate
      const isSkuConflict = item.product.sku && existingSkus.has(String(item.product.sku).trim());
      const val = validateProductRow(item.product);
      if (isSkuConflict && conflictMode === "flag") {
        val.isValid = false;
        val.errors.sku = "SKU already exists in store";
      }

      item.isValid = val.isValid;
      item.errors = val.errors;
      copy[rowIndex] = item;

      const validCount = copy.filter((p) => p.isValid).length;
      setStats({
        total: copy.length,
        valid: validCount,
        errors: copy.length - validCount,
      });

      return copy;
    });
  };

  // STEP 3: Complete Import
  const handleFinishImport = (onlyValid = false) => {
    let rowsToImport = onlyValid ? validatedData.filter((r) => r.isValid) : validatedData;

    if (conflictMode === "skip") {
      rowsToImport = rowsToImport.filter((r) => !r.isSkuConflict);
    }

    const finalProducts = rowsToImport.map((r) => ({
      ...r.product,
      isConflictUpdate: r.isSkuConflict && conflictMode === "update",
    }));

    onImportComplete(finalProducts);
    handleClose();
  };

  // Export failed rows
  const handleDownloadFailed = () => {
    const failed = validatedData
      .filter((r) => !r.isValid)
      .map((r) => ({
        row: r.raw,
        errors: r.errors,
      }));
    downloadFailedRowsCsv(failed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-sans backdrop-blur-xs">
      <div className="bg-white rounded-[6px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-[#ccd0d4] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ccd0d4] bg-[#f6f7f7]">
          <div>
            <h2 className="text-[17px] font-bold text-[#1d2327]">Import Products from CSV or Excel</h2>
            <p className="text-[12px] text-[#646970]">
              Upload your product catalog spreadsheet, map columns, preview errors, and import seamlessly.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-[#646970] hover:text-[#1d2327] p-1 rounded hover:bg-[#eaeaea] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#fafafa] border-b border-[#ccd0d4] text-[12px] font-medium">
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step >= 1 ? "bg-[#2271b1] text-white" : "bg-[#ccd0d4] text-white"
              }`}
            >
              1
            </span>
            <span className={step === 1 ? "font-bold text-[#1d2327]" : "text-[#646970]"}>Upload File</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#ccd0d4]" />
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step >= 2 ? "bg-[#2271b1] text-white" : "bg-[#ccd0d4] text-white"
              }`}
            >
              2
            </span>
            <span className={step === 2 ? "font-bold text-[#1d2327]" : "text-[#646970]"}>Map Columns</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#ccd0d4]" />
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step >= 3 ? "bg-[#2271b1] text-white" : "bg-[#ccd0d4] text-white"
              }`}
            >
              3
            </span>
            <span className={step === 3 ? "font-bold text-[#1d2327]" : "text-[#646970]"}>Validate & Preview</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-[#ccd0d4] hover:border-[#2271b1] transition-all rounded-[8px] p-8 text-center bg-[#fbfbfb]">
                <FileSpreadsheet className="w-12 h-12 text-[#2271b1] mx-auto mb-3" />
                <h3 className="text-[15px] font-bold text-[#1d2327] mb-1">
                  Drag and drop your spreadsheet here
                </h3>
                <p className="text-[12px] text-[#646970] mb-4">
                  Supports .csv and .xlsx files (up to 1,000 products per import)
                </p>
                
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#2271b1] text-white text-[13px] font-bold rounded-[3px] shadow-sm hover:bg-[#135e96] cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Select File
                  <input
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Sheet Selection if Excel has multiple sheets */}
              {sheets.length > 1 && (
                <div className="p-4 bg-[#f0f6fb] border border-[#2271b1]/30 rounded-[4px] space-y-2">
                  <span className="text-[13px] font-bold text-[#1d2327]">Multiple sheets detected in Excel file:</span>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedSheet}
                      onChange={(e) => setSelectedSheet(e.target.value)}
                      className="px-3 py-1.5 border border-[#8c8f94] rounded bg-white text-[13px] outline-none"
                    >
                      {sheets.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleSheetConfirm}
                      className="px-3 py-1.5 bg-[#2271b1] text-white text-[12px] font-bold rounded hover:bg-[#135e96] cursor-pointer"
                    >
                      Continue with Sheet
                    </button>
                  </div>
                </div>
              )}

              {/* Download Sample Templates */}
              <div className="pt-4 border-t border-[#ccd0d4] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#646970]">
                <span>Need a ready-made template with valid fields?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    className="flex items-center gap-1.5 px-3 py-1 border border-[#ccd0d4] rounded bg-white hover:bg-[#f6f7f7] text-[#2271b1] font-medium cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download CSV Template
                  </button>
                  <button
                    type="button"
                    onClick={downloadXlsxTemplate}
                    className="flex items-center gap-1.5 px-3 py-1 border border-[#ccd0d4] rounded bg-white hover:bg-[#f6f7f7] text-[#2271b1] font-medium cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Excel Template
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-[#1d2327]">Map Spreadsheet Columns</h3>
                  <p className="text-[12px] text-[#646970]">
                    Match each column from your file to a field in your store catalogue.
                  </p>
                </div>
                <span className="text-[12px] font-semibold text-[#2271b1] bg-[#f0f6fb] px-2.5 py-1 rounded border border-[#2271b1]/20">
                  {rawRows.length} rows detected
                </span>
              </div>

              {/* Mapping Table */}
              <div className="border border-[#ccd0d4] rounded-[4px] overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-[#f6f7f7] border-b border-[#ccd0d4] text-[#1d2327] font-bold">
                    <tr>
                      <th className="py-2.5 px-4">Your Spreadsheet Column</th>
                      <th className="py-2.5 px-4">Sample Data (Row 1)</th>
                      <th className="py-2.5 px-4">Store Product Field</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f1]">
                    {fileHeaders.map((header) => {
                      const sampleVal = rawRows[0]?.[header];
                      const currentField = mapping[header] || "skip";

                      return (
                        <tr key={header} className="hover:bg-[#fafafa]">
                          <td className="py-2 px-4 font-semibold text-[#2c3338]">{header}</td>
                          <td className="py-2 px-4 text-[#646970] truncate max-w-xs">
                            {String(sampleVal || "—")}
                          </td>
                          <td className="py-2 px-4">
                            <select
                              value={currentField}
                              onChange={(e) =>
                                setMapping((prev) => ({ ...prev, [header]: e.target.value }))
                              }
                              className={`w-full max-w-xs px-2.5 py-1 border rounded text-[12px] outline-none ${
                                currentField === "skip"
                                  ? "border-[#ccd0d4] text-[#8c8f94]"
                                  : "border-[#2271b1] text-[#1d2327] bg-[#f0f6fb]/50 font-medium"
                              }`}
                            >
                              <option value="skip">-- Skip Column --</option>
                              {BULK_COLUMNS.map((col) => (
                                <option key={col.key} value={col.key}>
                                  {col.label} {col.required ? "*" : ""}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Conflict Handling Mode */}
              <div className="p-4 bg-[#f9f9f9] border border-[#ccd0d4] rounded-[4px] space-y-2">
                <span className="text-[12px] font-bold text-[#1d2327]">Existing Product / SKU Handling:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
                  <label className="flex items-center gap-2 p-2 bg-white border border-[#ccd0d4] rounded cursor-pointer hover:bg-[#f0f6fb]">
                    <input
                      type="radio"
                      name="conflictMode"
                      value="skip"
                      checked={conflictMode === "skip"}
                      onChange={() => setConflictMode("skip")}
                      className="text-[#2271b1]"
                    />
                    <span>Skip existing products</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-white border border-[#ccd0d4] rounded cursor-pointer hover:bg-[#f0f6fb]">
                    <input
                      type="radio"
                      name="conflictMode"
                      value="update"
                      checked={conflictMode === "update"}
                      onChange={() => setConflictMode("update")}
                      className="text-[#2271b1]"
                    />
                    <span>Update matching products</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-white border border-[#ccd0d4] rounded cursor-pointer hover:bg-[#f0f6fb]">
                    <input
                      type="radio"
                      name="conflictMode"
                      value="flag"
                      checked={conflictMode === "flag"}
                      onChange={() => setConflictMode("flag")}
                      className="text-[#2271b1]"
                    />
                    <span>Flag conflicts as errors</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & VALIDATION */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-[#f6f7f7] border border-[#ccd0d4] rounded-[4px]">
                <div className="flex items-center gap-4 text-[13px]">
                  <span className="font-bold text-[#1d2327]">
                    Total Rows: <strong>{stats.total}</strong>
                  </span>
                  <span className="text-[#00a32a] flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <strong>{stats.valid}</strong> Valid
                  </span>
                  {stats.errors > 0 && (
                    <span className="text-[#d63638] flex items-center gap-1 font-medium">
                      <AlertCircle className="w-4 h-4" />
                      <strong>{stats.errors}</strong> Errors
                    </span>
                  )}
                </div>

                {stats.errors > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadFailed}
                    className="flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium text-[#d63638] bg-white border border-[#d63638]/40 rounded hover:bg-[#ffebe9] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Failed Rows (CSV)
                  </button>
                )}
              </div>

              {/* Preview Table */}
              <div className="border border-[#ccd0d4] rounded-[4px] overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-[#f6f7f7] border-b border-[#ccd0d4] text-[#1d2327] font-bold sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-16 text-center">Row</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Price</th>
                      <th className="py-2 px-3">Stock</th>
                      <th className="py-2 px-3">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f1]">
                    {validatedData.map((item, idx) => {
                      const hasNameErr = Boolean(item.errors?.name);
                      const hasPriceErr = Boolean(item.errors?.price);
                      const hasSkuErr = Boolean(item.errors?.sku);

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-[#fafafa] ${
                            !item.isValid ? "bg-[#fff8f7]" : ""
                          }`}
                        >
                          <td className="py-2 px-3 text-center text-[#646970]">
                            {item.rowNumber}
                          </td>
                          <td className="py-2 px-3">
                            {item.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[#00a32a] font-bold text-[11px]">
                                <Check className="w-3.5 h-3.5" />
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#d63638] font-bold text-[11px]" title={Object.values(item.errors).join("; ")}>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Invalid
                              </span>
                            )}
                          </td>
                          <td className="py-1 px-3">
                            <input
                              type="text"
                              value={item.product.name || ""}
                              onChange={(e) =>
                                handleCellEditInPreview(idx, "name", e.target.value)
                              }
                              className={`w-full px-2 py-1 text-[12px] border rounded ${
                                hasNameErr ? "border-[#d63638] bg-white" : "border-transparent hover:border-[#ccd0d4]"
                              }`}
                            />
                            {hasNameErr && (
                              <span className="text-[10px] text-[#d63638] block mt-0.5">
                                {item.errors.name}
                              </span>
                            )}
                          </td>
                          <td className="py-1 px-3">
                            <input
                              type="text"
                              value={item.product.sku || ""}
                              onChange={(e) =>
                                handleCellEditInPreview(idx, "sku", e.target.value)
                              }
                              className={`w-full px-2 py-1 text-[12px] border rounded ${
                                hasSkuErr ? "border-[#d63638] bg-white" : "border-transparent hover:border-[#ccd0d4]"
                              }`}
                            />
                            {hasSkuErr && (
                              <span className="text-[10px] text-[#d63638] block mt-0.5">
                                {item.errors.sku}
                              </span>
                            )}
                          </td>
                          <td className="py-1 px-3">
                            <input
                              type="number"
                              step="0.01"
                              value={item.product.price !== undefined ? item.product.price : ""}
                              onChange={(e) =>
                                handleCellEditInPreview(idx, "price", e.target.value)
                              }
                              className={`w-20 px-2 py-1 text-[12px] border rounded ${
                                hasPriceErr ? "border-[#d63638] bg-white" : "border-transparent hover:border-[#ccd0d4]"
                              }`}
                            />
                            {hasPriceErr && (
                              <span className="text-[10px] text-[#d63638] block mt-0.5">
                                {item.errors.price}
                              </span>
                            )}
                          </td>
                          <td className="py-1 px-3">
                            <input
                              type="number"
                              value={item.product.stock !== undefined ? item.product.stock : 0}
                              onChange={(e) =>
                                handleCellEditInPreview(idx, "stock", e.target.value)
                              }
                              className="w-16 px-2 py-1 text-[12px] border border-transparent hover:border-[#ccd0d4] rounded"
                            />
                          </td>
                          <td className="py-1 px-3 text-[#646970]">
                            {item.product.category || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#ccd0d4] bg-[#f6f7f7]">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-3.5 py-1.5 text-[13px] text-[#2c3338] bg-white border border-[#ccd0d4] rounded-[3px] hover:bg-[#f0f0f1] cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 text-[13px] text-[#2c3338] bg-white border border-[#ccd0d4] rounded-[3px] hover:bg-[#f0f0f1] cursor-pointer"
            >
              Cancel
            </button>

            {step === 2 && (
              <button
                type="button"
                onClick={handleProceedToPreview}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-bold text-white bg-[#2271b1] hover:bg-[#135e96] rounded-[3px] shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    Proceed to Preview
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {step === 3 && (
              <>
                {stats.errors > 0 && stats.valid > 0 && (
                  <button
                    type="button"
                    onClick={() => handleFinishImport(true)}
                    className="px-3.5 py-1.5 text-[13px] font-bold text-[#00a32a] bg-white border border-[#00a32a] hover:bg-[#f0f9f3] rounded-[3px] shadow-xs cursor-pointer"
                  >
                    Import Valid Only ({stats.valid})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleFinishImport(false)}
                  disabled={stats.valid === 0}
                  className="px-4 py-1.5 text-[13px] font-bold text-white bg-[#2271b1] hover:bg-[#135e96] rounded-[3px] shadow-sm cursor-pointer disabled:opacity-50"
                >
                  Import Products ({stats.valid})
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
