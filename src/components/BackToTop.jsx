import React, { useEffect, useState } from "react";
import { FiArrowUp } from "react-icons/fi";

// Bottom-left, not bottom-right — ChatWidget already lives there on pages
// where both appear (it renders for signed-in non-admin users, this shows
// on the public marketing pages, so overlap is rare, but keeping them on
// opposite corners avoids it entirely either way).
const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="fixed bottom-5 left-5 z-50 w-11 h-11 rounded-full bg-iris text-accent-ink flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
    >
      <FiArrowUp size={18} />
    </button>
  );
};

export default BackToTop;
