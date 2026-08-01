import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FiMail, FiLock, FiArrowRight, FiEye, FiEyeOff, FiShield } from "react-icons/fi";
import FanPayLogo from "../../components/FanPayLogo";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const { login, checkAdminStatus, logout, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    setError("");
    setInfo("");
    if (!email) {
      setError("Enter your email above first, then tap \"Forgot password?\"");
      return;
    }
    try {
      await resetPassword(email);
      setInfo("Password reset email sent — check your inbox.");
    } catch (err) {
      setError("Couldn't send reset email. Check the address and try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email, password);
      // Force-refresh the token so a claim granted moments ago is picked up,
      // then gate entry on the admin claim — this door is admin-only.
      const admin = await checkAdminStatus(result.user, true);
      if (!admin) {
        await logout();
        setError("This account doesn't have admin access.");
        setLoading(false);
        return;
      }
      navigate("/admin");
    } catch (err) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setError("Invalid email or password.");
      } else {
        setError("Sign-in failed. Please try again.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface mesh-bg flex items-center justify-center px-4 py-12">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-iris to-transparent" />

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-6">
            <FanPayLogo className="h-10 w-auto" />
          </Link>
          <div className="w-12 h-12 rounded-2xl bg-iris/15 border border-iris/25 flex items-center justify-center mx-auto mb-4">
            <FiShield size={20} className="text-iris" />
          </div>
          <h1 className="font-syne font-bold text-2xl text-ink mb-2">Admin Portal</h1>
          <p className="text-ink/50 font-dm text-sm">Sign in to the FanPay admin dashboard</p>
        </div>

        <div className="card-flat p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 text-red-400 font-dm text-sm">
              {error}
            </div>
          )}
          {info && (
            <div className="bg-iris/10 border border-iris/20 rounded-xl px-4 py-3 mb-5 text-iris font-dm text-sm">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-ink/60 font-dm text-xs mb-1.5 block">Email Address</label>
              <div className="relative">
                <FiMail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field-light pl-10"
                  placeholder="admin@fanpay.ng"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-ink/60 font-dm text-xs mb-1.5 block">Password</label>
              <div className="relative">
                <FiLock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field-light pl-10 pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60"
                >
                  {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-iris font-dm text-xs hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-iris flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : <>Sign In <FiArrowRight size={14} /></>}
            </button>
          </form>
        </div>

        <div className="mt-4 card-flat p-3 text-center">
          <p className="text-ink/30 font-dm text-xs">
            Secure access only. All sign-ins are logged.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
