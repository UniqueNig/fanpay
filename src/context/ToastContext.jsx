import React, { createContext, useContext, useState, useCallback } from "react";
import { FiCheckCircle, FiXCircle, FiInfo, FiX } from "react-icons/fi";

const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

let idCounter = 0;

// Fixed (theme-independent) styling rather than the app's light/dark tokens
// — toasts render globally, including over pages that are still on the old
// fixed-dark theme (Login/Signup/marketing/admin, see RESUME.md), so a
// solid white card reads correctly regardless of what's underneath.
const VARIANTS = {
  success: { Icon: FiCheckCircle, accent: "border-l-emerald-500 text-emerald-500" },
  error: { Icon: FiXCircle, accent: "border-l-red-500 text-red-500" },
  info: { Icon: FiInfo, accent: "border-l-violet-500 text-violet-500" },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback((message, type = "info") => {
    const id = ++idCounter;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map((t) => {
          const { Icon, accent } = VARIANTS[t.type] || VARIANTS.info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-2.5 bg-white border border-gray-200 border-l-4 rounded-xl px-4 py-3 shadow-xl font-dm text-sm text-gray-800 animate-[toast-in_0.25s_ease-out] ${accent}`}
            >
              <Icon size={17} className="shrink-0 mt-0.5" />
              <p className="flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600 shrink-0">
                <FiX size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
