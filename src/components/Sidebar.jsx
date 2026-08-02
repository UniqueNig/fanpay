import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FiGrid, FiFileText, FiSmartphone, FiPhoneCall, FiTag,
  FiLogOut, FiX, FiPlusCircle, FiList, FiShield, FiSettings, FiUserCheck, FiBookOpen, FiCode,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import FanFiLogo from "./FanFiLogo";
import Skeleton from "./Skeleton";

// Transfer and Savings are deliberately not linked here for now (not
// deleted — routes still work if visited directly) — a product decision to
// simplify the nav down to what's launching first; both are planned as a
// future feature.
const navItems = [
  { to: "/dashboard", icon: <FiGrid size={17} />, label: "Overview" },
  { to: "/transactions", icon: <FiList size={17} />, label: "Transactions" },
  { to: "/deposit", icon: <FiPlusCircle size={17} />, label: "Deposit", highlight: true },
  { to: "/recharge?type=airtime", icon: <FiPhoneCall size={17} />, label: "Buy Airtime" },
  { to: "/recharge?type=data", icon: <FiSmartphone size={17} />, label: "Buy Data" },
  { to: "/bills", icon: <FiFileText size={17} />, label: "Pay Bills" },
  { to: "/result-checker", icon: <FiBookOpen size={17} />, label: "Result Checker" },
  { to: "/pricing", icon: <FiTag size={17} />, label: "Pricing" },
  { to: "/kyc", icon: <FiUserCheck size={17} />, label: "Verify Identity" },
  { to: "/settings", icon: <FiSettings size={17} />, label: "Settings" },
];

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user, userData, logout, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-line">
        <FanFiLogo className="h-8 w-auto" />
        {mobileOpen !== undefined && (
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-ink/50 hover:text-ink">
            <FiX size={18} />
          </button>
        )}
      </div>

      {/* User info — skeleton while auth/profile is still resolving (e.g.
          right after a page refresh) rather than flashing "U" / "User" */}
      <div className="px-5 py-5 border-b border-line">
        {loading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3.5 w-28 mb-1.5" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-iris/15 border border-iris/20 flex items-center justify-center">
              <span className="text-iris font-syne font-bold text-sm">
                {user?.displayName?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-ink font-syne font-semibold text-sm leading-tight truncate">
                {user?.displayName || "User"}
              </p>
              <p className="text-ink/40 font-dm text-xs truncate">{user?.email}</p>
            </div>
          </div>
        )}
        {/* Balance pill */}
        {loading ? (
          <Skeleton className="mt-3 h-9 w-full rounded-xl" />
        ) : (
          <div className="mt-3 bg-iris/8 border border-iris/15 rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-ink/45 font-dm text-[11px]">Balance</span>
            <span className="text-iris font-syne font-bold text-xs">
              ₦{(userData?.balance || 0).toLocaleString("en-NG")}
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/dashboard"}
            onClick={() => setMobileOpen && setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl font-dm text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-iris text-accent-ink"
                  : item.highlight
                  ? "text-iris/70 hover:text-iris hover:bg-iris/8 border border-dashed border-iris/20 hover:border-iris/40 font-normal"
                  : "text-ink/55 hover:text-ink hover:bg-surface font-normal"
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Developer API entry point — always visible; DeveloperPortal itself
          handles the "not registered yet" state with a register CTA. */}
      <div className="px-3 pt-2">
        <NavLink
          to="/developer"
          onClick={() => setMobileOpen && setMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-dm text-sm text-iris/80 hover:text-iris hover:bg-iris/8 border border-dashed border-iris/20 hover:border-iris/40 transition-all duration-200"
        >
          <FiCode size={17} />
          Developer API
        </NavLink>
      </div>

      {/* Admin panel link — only rendered for accounts with the admin claim */}
      {isAdmin && (
        <div className="px-3 pt-2">
          <NavLink
            to="/admin"
            onClick={() => setMobileOpen && setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-dm text-sm text-iris/80 hover:text-iris hover:bg-iris/8 border border-dashed border-iris/20 hover:border-iris/40 transition-all duration-200"
          >
            <FiShield size={17} />
            Admin Panel
          </NavLink>
        </div>
      )}

      {/* Logout */}
      <div className="px-3 py-4 border-t border-line">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-ink/50 hover:text-red-400 hover:bg-red-400/5 font-dm text-sm transition-all duration-200"
        >
          <FiLogOut size={17} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col bg-panel border-r border-line h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-panel border-r border-line z-50 flex flex-col">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
};

export default Sidebar;
