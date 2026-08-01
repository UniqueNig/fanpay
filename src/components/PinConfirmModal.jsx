import React, { useRef, useState } from "react";
import { FiX, FiLock } from "react-icons/fi";
import { formatNaira } from "../utils/helpers";

// 4-digit PIN entry, one box per digit with auto-advance/auto-submit — same
// pattern used for OTP inputs. Reused by every money-out flow (Transfer,
// Bills, Recharge) right before the final API call.
//
// `summary` (optional) — array of { label, value } pairs shown as a
// receipt-style breakdown above the PIN boxes (product, recipient, plan,
// etc) so the user sees exactly what they're paying for before confirming,
// not just a generic amount in the subtitle. `amount`/`balance` (optional)
// render as their own highlighted rows. Matches the confirm-purchase
// pattern most VTU/wallet apps use (Maskawasub's own consumer app included).
const PinConfirmModal = ({
  title = "Enter your PIN", subtitle, summary, amount, balance,
  onConfirm, onClose, submitting, error,
}) => {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  const handleChange = (i, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);

    if (digit && i < 3) {
      inputRefs[i + 1].current?.focus();
    } else if (digit && i === 3 && next.every((d) => d !== "")) {
      onConfirm(next.join(""));
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs[i - 1].current?.focus();
    }
  };

  const handleSubmit = () => {
    const pin = digits.join("");
    if (pin.length === 4) onConfirm(pin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-panel border border-line rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-1">
          {amount != null ? (
            <p className="font-syne font-bold text-ink text-2xl">{formatNaira(amount)}</p>
          ) : (
            <div className="flex items-center gap-2">
              <FiLock size={15} className="text-iris" />
              <h3 className="font-syne font-semibold text-ink text-base">{title}</h3>
            </div>
          )}
          <button onClick={onClose} className="text-ink/40 hover:text-ink -mt-1">
            <FiX size={18} />
          </button>
        </div>
        {subtitle && <p className="text-ink/40 font-dm text-xs px-6">{subtitle}</p>}

        {summary?.length > 0 && (
          <div className="mx-6 mt-4 bg-surface border border-line rounded-xl divide-y divide-line overflow-hidden">
            {summary.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-ink/50 font-dm text-xs">{row.label}</span>
                <span className="text-ink font-dm text-sm font-medium text-right">{row.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="px-6 pt-5">
          <p className="text-ink/50 font-dm text-xs text-center mb-3">Enter Transaction PIN</p>
          <div className="flex justify-center gap-3">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={inputRefs[i]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                autoFocus={i === 0}
                className="w-12 h-14 text-center text-xl font-syne font-bold bg-surface border border-line rounded-xl text-ink focus:border-iris/50 focus:outline-none"
              />
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 font-dm text-xs text-center px-6 mt-4">{error}</p>}

        {balance != null && (
          <div className="flex items-center justify-between bg-surface border border-line rounded-xl px-4 py-3 mx-6 mt-5">
            <span className="text-ink/50 font-dm text-sm">Available Balance</span>
            <span className="text-ink font-syne font-bold text-sm">{formatNaira(balance)}</span>
          </div>
        )}

        <div className="p-6 pt-5">
          <button
            onClick={handleSubmit}
            disabled={submitting || digits.some((d) => !d)}
            className="btn-iris w-full flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <FiLock size={15} />
            {submitting ? "Confirming..." : "Pay Now"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinConfirmModal;
