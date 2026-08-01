import React, { useState } from "react";
import { FiMenu, FiSun, FiMoon } from "react-icons/fi";
import AdminSidebar from "./AdminSidebar";
import FanPayLogo from "./FanPayLogo";
import { useTheme } from "../context/ThemeContext";

const ThemeToggleButton = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="text-ink/60 hover:text-ink p-1.5"
    >
      {theme === "dark" ? <FiSun size={19} /> : <FiMoon size={19} />}
    </button>
  );
};

const AdminLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <AdminSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between gap-3 px-4 h-14 border-b border-line bg-panel">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="text-ink/60 hover:text-ink">
              <FiMenu size={20} />
            </button>
            <FanPayLogo className="h-7 w-auto" />
            <span className="bg-iris/15 border border-iris/25 text-iris text-[10px] font-syne font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Admin
            </span>
          </div>
          <ThemeToggleButton />
        </div>
        {/* Desktop top strip */}
        <div className="hidden lg:flex items-center justify-end px-6 h-14 border-b border-line">
          <ThemeToggleButton />
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
