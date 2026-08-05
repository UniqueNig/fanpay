import React from "react";
import { FiSpeaker, FiX } from "react-icons/fi";

// Presentational only — Dashboard.jsx decides whether to render this
// (settings.announcement.enabled + not already dismissed for this exact
// title/body, see its localStorage-keyed check). Visual chrome matches
// components/ConfirmModal.jsx for consistency.
const AnnouncementModal = ({ title, body, onDismiss }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onDismiss}>
    <div className="w-full max-w-sm bg-panel border border-line rounded-2xl p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
      <button onClick={onDismiss} className="absolute top-4 right-4 text-ink/30 hover:text-ink/60">
        <FiX size={18} />
      </button>

      <div className="w-11 h-11 rounded-xl bg-iris/10 flex items-center justify-center mb-4">
        <FiSpeaker size={19} className="text-iris" />
      </div>

      <h3 className="font-syne font-bold text-ink text-lg mb-2">{title}</h3>
      <p className="text-ink/50 font-dm text-sm leading-relaxed mb-6 whitespace-pre-wrap">{body}</p>

      <button onClick={onDismiss} className="btn-iris w-full">Got it</button>
    </div>
  </div>
);

export default AnnouncementModal;
