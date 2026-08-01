import React, { useState } from "react";
import { FiChevronDown, FiChevronUp, FiPhoneCall, FiCheckCircle } from "react-icons/fi";

// Standard self-service USSD codes for checking phone number / airtime
// balance / data balance — sourced from a reference VTU app's own reference
// list (user-provided), not independently re-verified against each
// network's current published codes. These are slow-changing but do
// occasionally get retired/reassigned by the networks — worth a spot check
// if a customer reports one not working.
const USSD_CODES = [
  { id: "mtn", label: "MTN", color: "#FFCC00", phoneNumber: "*663#", airtime: "*310#", data: "*323#" },
  { id: "glo", label: "GLO", color: "#00AA00", phoneNumber: "*777#", airtime: "*310#", data: "*323#" },
  { id: "airtel", label: "Airtel", color: "#FF0000", phoneNumber: "*121*2*4#", airtime: "*310#", data: "*323#" },
  { id: "9mobile", label: "9mobile", color: "#00AA88", phoneNumber: "*248#", airtime: "*310#", data: "*323#" },
];

const CODE_LABELS = { phoneNumber: "Phone Number", airtime: "Airtime", data: "Data" };

const UssdCodes = () => {
  const [open, setOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
  };

  return (
    <div className="card-flat overflow-hidden mt-5">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-iris/15 flex items-center justify-center shrink-0">
            <FiPhoneCall size={16} className="text-iris" />
          </div>
          <div className="text-left">
            <p className="text-ink font-syne font-semibold text-sm">Check Phone Balance</p>
            <p className="text-ink/40 font-dm text-xs">USSD codes for all networks</p>
          </div>
        </div>
        {open ? <FiChevronUp className="text-ink/40 shrink-0" /> : <FiChevronDown className="text-ink/40 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-line p-4 flex flex-col gap-3">
          {USSD_CODES.map((n) => (
            <div key={n.id} className="bg-surface border border-line rounded-xl p-3.5">
              <p className="font-syne font-bold text-sm mb-2.5" style={{ color: n.color }}>{n.label}</p>
              <div className="grid grid-cols-3 gap-2">
                {["phoneNumber", "airtime", "data"].map((k) => (
                  <button key={k} type="button" onClick={() => handleCopy(n[k])}
                    className="bg-panel border border-line rounded-lg px-2 py-2 text-center hover:border-iris/30 transition-colors">
                    <p className="text-ink/40 font-dm text-[10px] mb-0.5">{CODE_LABELS[k]}</p>
                    <p className="text-ink font-syne font-bold text-xs">{n[k]}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {copiedCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setCopiedCode(null)}>
          <div className="w-full max-w-xs bg-panel border border-line rounded-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-iris/15 border border-iris/25 flex items-center justify-center mx-auto mb-4">
              <FiCheckCircle size={26} className="text-iris" />
            </div>
            <p className="font-syne font-bold text-ink text-base mb-2">Copied!</p>
            <p className="text-ink/50 font-dm text-sm mb-5">
              USSD code {copiedCode} copied to clipboard. Dial it on your phone to check balance.
            </p>
            <button onClick={() => setCopiedCode(null)} className="btn-iris w-full">OK</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UssdCodes;
