import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { FiMenu, FiX, FiLogOut, FiUser, FiSun, FiMoon } from "react-icons/fi";
import fanpayLogo from "../assets/abopay-logo.svg";

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

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const navLinks = user
    ? [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/bills", label: "Pay Bills" },
        { to: "/recharge", label: "Recharge" },
      ]
    : [
        { to: "/#features", label: "Features" },
        { to: "/#how", label: "How It Works" },
        { to: "/#faq", label: "FAQ" },
      ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-surface/95 backdrop-blur-md border-b border-line shadow-xl" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src={fanpayLogo} alt="FanPay" className="h-8 w-auto" />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`nav-link ${location.pathname === l.to ? "text-iris" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* CTA / User */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggleButton />
          {user ? (
            <>
              <span className="flex items-center gap-2 text-ink/60 font-dm text-sm">
                <FiUser size={14} /> {user.displayName?.split(" ")[0]}
              </span>
              <button onClick={handleLogout} className="btn-outline-iris flex items-center gap-2 text-xs px-4 py-2">
                <FiLogOut size={13} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/signup" className="btn-iris text-xs px-5 py-2.5">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="md:hidden flex items-center gap-1">
          <ThemeToggleButton />
          <button
            className="text-ink/80 p-1"
            onClick={() => setOpen(!open)}
          >
            {open ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-surface/98 backdrop-blur-xl border-b border-line px-4 py-4 flex flex-col gap-3">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="nav-link py-2 border-b border-line"
            >
              {l.label}
            </Link>
          ))}
          <div className="flex gap-3 pt-2">
            {user ? (
              <button onClick={handleLogout} className="btn-outline-iris w-full text-sm">Logout</button>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="btn-outline-iris flex-1 text-center text-sm">Login</Link>
                <Link to="/signup" onClick={() => setOpen(false)} className="btn-iris flex-1 text-center text-sm">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
