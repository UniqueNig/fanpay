import React from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import {
  FiGrid, FiUsers, FiList, FiLogOut, FiX, FiShield, FiArrowLeft, FiLogIn,
  FiUserCheck, FiUserX, FiAlertTriangle, FiDollarSign, FiSettings, FiTag,
  FiKey, FiTerminal, FiMail, FiCpu, FiMessageCircle, FiWifi, FiPercent,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import FanPayLogo from "./FanPayLogo";

const navItems = [
  { to: "/admin", icon: <FiGrid size={17} />, label: "Overview" },
  { to: "/admin/users", icon: <FiUsers size={17} />, label: "Users" },
  { to: "/admin/admins", icon: <FiUserCheck size={17} />, label: "Admin Management" },
  { to: "/admin/account-deletions", icon: <FiUserX size={17} />, label: "Account Deletions" },
  { to: "/admin/kyc", icon: <FiShield size={17} />, label: "KYC Compliance" },
  { to: "/admin/login-logs", icon: <FiLogIn size={17} />, label: "Login Logs" },
  { to: "/admin/pin-requests", icon: <FiKey size={17} />, label: "PIN Management" },
  { to: "/admin/transactions", icon: <FiList size={17} />, label: "Transactions" },
  { to: "/admin/vtu-transactions", icon: <FiWifi size={17} />, label: "VTU Transactions" },
  { to: "/admin/disputes", icon: <FiAlertTriangle size={17} />, label: "Transfer Disputes" },
  { to: "/admin/finance", icon: <FiDollarSign size={17} />, label: "Finance" },
  { to: "/admin/marketing", icon: <FiTag size={17} />, label: "Marketing" },
  { to: "/admin/pricing-catalog", icon: <FiPercent size={17} />, label: "Pricing Catalog" },
  { to: "/admin/settings", icon: <FiSettings size={17} />, label: "Settings" },
  { to: "/admin/comms", icon: <FiMail size={17} />, label: "Email & SMS" },
  { to: "/admin/live-chat", icon: <FiMessageCircle size={17} />, label: "Live Chat" },
  { to: "/admin/system-logs", icon: <FiTerminal size={17} />, label: "Cron Jobs & Logs" },
  { to: "/admin/assistant", icon: <FiCpu size={17} />, label: "Assistant" },
];

const AdminSidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-line">
        <div className="flex items-center gap-2">
          <FanPayLogo className="h-7 w-auto" />
          <span className="bg-iris/15 border border-iris/25 text-iris text-[10px] font-syne font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Admin
          </span>
        </div>
        {mobileOpen !== undefined && (
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-ink/50 hover:text-ink">
            <FiX size={18} />
          </button>
        )}
      </div>

      {/* Admin info */}
      <div className="px-5 py-5 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-iris/15 border border-iris/20 flex items-center justify-center">
            <FiShield size={15} className="text-iris" />
          </div>
          <div className="min-w-0">
            <p className="text-ink font-syne font-semibold text-sm leading-tight truncate">
              {user?.displayName || "Admin"}
            </p>
            <p className="text-ink/40 font-dm text-xs truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/admin"}
            onClick={() => setMobileOpen && setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl font-dm text-sm transition-all duration-200 ${
                isActive
                  ? "bg-iris/15 text-iris border border-iris/20"
                  : "text-ink/55 hover:text-ink hover:bg-surface"
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-line flex flex-col gap-1">
        <Link
          to="/dashboard"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-ink/50 hover:text-ink hover:bg-surface font-dm text-sm transition-all duration-200"
        >
          <FiArrowLeft size={17} />
          Exit to App
        </Link>
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

export default AdminSidebar;
