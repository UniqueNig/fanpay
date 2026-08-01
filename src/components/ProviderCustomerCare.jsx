import React, { useState } from "react";
import { FiChevronDown, FiChevronUp, FiHeadphones, FiCheckCircle } from "react-icons/fi";

// Cable provider support lines — sourced from a reference VTU app's own
// reference list (user-provided), not independently re-verified. DStv and
// GOtv share the same customer care lines (both are MultiChoice brands).
const PROVIDERS = [
  { id: "dstv-gotv", label: "DStv / GOtv", lines: ["01-2703232", "08039003788"], tollFree: ["08149860333", "07080630333", "09090630333"] },
  { id: "startimes", label: "StarTimes", lines: ["094618888", "014618888"] },
];

const ProviderCustomerCare = () => {
  const [open, setOpen] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(null);

  const handleCopy = (number) => {
    navigator.clipboard.writeText(number);
    setCopiedNumber(number);
  };

  return (
    <div className="card-flat overflow-hidden mt-5">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-iris/15 flex items-center justify-center shrink-0">
            <FiHeadphones size={16} className="text-iris" />
          </div>
          <div className="text-left">
            <p className="text-ink font-syne font-semibold text-sm">Provider Customer Care</p>
            <p className="text-ink/40 font-dm text-xs">Contact numbers for subscription issues</p>
          </div>
        </div>
        {open ? <FiChevronUp className="text-ink/40 shrink-0" /> : <FiChevronDown className="text-ink/40 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-line p-4 flex flex-col gap-3">
          {PROVIDERS.map((p) => (
            <div key={p.id} className="bg-surface border border-line rounded-xl p-3.5">
              <p className="font-syne font-bold text-ink text-sm mb-2.5">{p.label}</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {p.lines.map((n) => (
                  <button key={n} type="button" onClick={() => handleCopy(n)}
                    className="bg-panel border border-line rounded-lg px-3 py-1.5 hover:border-iris/30 transition-colors">
                    <p className="text-ink font-syne font-semibold text-xs">{n}</p>
                  </button>
                ))}
              </div>
              {p.tollFree && (
                <div>
                  <p className="text-ink/35 font-dm text-[11px] mb-1.5">Toll Free</p>
                  <div className="flex flex-wrap gap-2">
                    {p.tollFree.map((n) => (
                      <button key={n} type="button" onClick={() => handleCopy(n)}
                        className="bg-panel border border-line rounded-lg px-3 py-1.5 hover:border-iris/30 transition-colors">
                        <p className="text-ink font-syne font-semibold text-xs">{n}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {copiedNumber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setCopiedNumber(null)}>
          <div className="w-full max-w-xs bg-panel border border-line rounded-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-iris/15 border border-iris/25 flex items-center justify-center mx-auto mb-4">
              <FiCheckCircle size={26} className="text-iris" />
            </div>
            <p className="font-syne font-bold text-ink text-base mb-2">Copied!</p>
            <p className="text-ink/50 font-dm text-sm mb-5">{copiedNumber} copied to clipboard.</p>
            <button onClick={() => setCopiedNumber(null)} className="btn-iris w-full">OK</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderCustomerCare;
