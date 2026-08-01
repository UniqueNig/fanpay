import React from "react";
import { FiAlertTriangle } from "react-icons/fi";

// Themed stand-in for window.confirm() — that browser-native dialog can't be
// styled, doesn't match either theme, and (on some browsers/OSes) can be
// visually ambiguous about which button does what. Presentational only: the
// caller owns whatever state decides `open`, and what actually happens on
// confirm — this just asks the question and reports the answer.
const ConfirmModal = ({
  open, title = "Are you sure?", message, confirmLabel = "Confirm", cancelLabel = "Cancel",
  danger = false, submitting = false, onConfirm, onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-sm bg-panel border border-line rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${danger ? "bg-red-500/10" : "bg-iris/10"}`}>
          <FiAlertTriangle size={19} className={danger ? "text-red-400" : "text-iris"} />
        </div>
        <h3 className="font-syne font-bold text-ink text-lg mb-2">{title}</h3>
        {message && <p className="text-ink/50 font-dm text-sm leading-relaxed mb-6">{message}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 font-dm text-sm font-medium rounded-xl py-2.5 border border-line text-ink/70 hover:bg-surface transition-colors disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className={`flex-1 font-dm text-sm font-semibold rounded-xl py-2.5 transition-colors disabled:opacity-60 ${
              danger ? "bg-red-500 text-white hover:bg-red-600" : "bg-iris text-accent-ink hover:opacity-90"
            }`}
          >
            {submitting ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
