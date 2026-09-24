"use client";

import React from "react";
import { X, AlertTriangle, Plus, RefreshCw, Trash2, Loader2 } from "lucide-react";

export default function SaveConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isSaving,
  summary = { creates: 0, updates: 0, deletes: 0 },
}) {
  if (!isOpen) return null;

  const totalChanges = summary.creates + summary.updates + summary.deletes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-sans backdrop-blur-xs">
      <div className="bg-white rounded-[6px] shadow-2xl w-full max-w-md overflow-hidden border border-[#ccd0d4] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#ccd0d4] bg-[#f6f7f7]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#d63638]" />
            <h2 className="text-[16px] font-bold text-[#1d2327]">Confirm Bulk Save</h2>
          </div>
          {!isSaving && (
            <button
              type="button"
              onClick={onClose}
              className="text-[#646970] hover:text-[#1d2327] p-1 rounded hover:bg-[#eaeaea] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-[13px]">
          <p className="text-[#3c434a]">
            You have <strong className="text-[#1d2327]">{totalChanges}</strong> pending change(s) ready to be committed to the database:
          </p>

          <div className="space-y-2 bg-[#f6f7f7] p-3.5 rounded-[4px] border border-[#ccd0d4]">
            {summary.creates > 0 && (
              <div className="flex items-center justify-between text-[#00a32a] font-medium">
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  New Products to Create:
                </span>
                <span className="bg-white px-2 py-0.5 rounded border border-[#00a32a]/30 font-bold">
                  +{summary.creates}
                </span>
              </div>
            )}

            {summary.updates > 0 && (
              <div className="flex items-center justify-between text-[#2271b1] font-medium">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Existing Products to Update:
                </span>
                <span className="bg-white px-2 py-0.5 rounded border border-[#2271b1]/30 font-bold">
                  {summary.updates}
                </span>
              </div>
            )}

            {summary.deletes > 0 && (
              <div className="flex items-center justify-between text-[#d63638] font-medium">
                <span className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Products to Move to Trash:
                </span>
                <span className="bg-white px-2 py-0.5 rounded border border-[#d63638]/30 font-bold">
                  -{summary.deletes}
                </span>
              </div>
            )}
          </div>

          <p className="text-[12px] text-[#646970]">
            These updates will take effect immediately across your store catalog.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#ccd0d4] bg-[#f6f7f7]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-3.5 py-1.5 text-[13px] text-[#2c3338] bg-white border border-[#ccd0d4] rounded-[3px] hover:bg-[#f0f0f1] cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-1.5 text-[13px] font-bold text-white bg-[#2271b1] hover:bg-[#135e96] rounded-[3px] shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              "Confirm & Save Changes"
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
