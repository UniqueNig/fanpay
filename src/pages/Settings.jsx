import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../api";
import { FiAlertTriangle, FiLock, FiKey, FiCheck } from "react-icons/fi";

const Settings = () => {
  const { user, userData, logout, fetchUserData } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pinResetRequested, setPinResetRequested] = useState(false);
  const [pinResetSubmitting, setPinResetSubmitting] = useState(false);
  const [phone, setPhone] = useState(userData?.phone || "");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const handleSavePhone = async () => {
    setPhoneSaving(true);
    setPhoneError("");
    setPhoneSaved(false);
    try {
      await api.patch("/users/me", { phone: phone.trim() });
      await fetchUserData(user.uid);
      setPhoneSaved(true);
      showToast("Phone number updated.", "success");
      setTimeout(() => setPhoneSaved(false), 2000);
    } catch (err) {
      const msg = err.message || "Could not save phone number.";
      setPhoneError(msg);
      showToast(msg, "error");
    }
    setPhoneSaving(false);
  };

  const handleRequestPinReset = async () => {
    setPinResetSubmitting(true);
    try {
      await api.post("/pin-reset-requests", {});
      setPinResetRequested(true);
    } catch (err) {
      setError(err.message || "Could not submit request. Try again.");
    }
    setPinResetSubmitting(false);
  };

  const handleRequestDeletion = async () => {
    setSubmitting(true);
    setError("");
    try {
      await api.post("/account-deletion-requests", { reason: reason.trim() });
      setSubmitted(true);
      setConfirming(false);
    } catch (err) {
      setError(err.message || "Could not submit request. Try again.");
    }
    setSubmitting(false);
  };

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-lg">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-ink text-2xl">Settings</h1>
          <p className="text-ink/40 font-dm text-sm mt-1">Account details and preferences</p>
        </div>

        <div className="card-flat p-6 mb-6">
          <p className="text-ink/40 font-dm text-xs uppercase tracking-wider mb-1">Name</p>
          <p className="text-ink font-dm text-sm mb-4">{user?.displayName || "—"}</p>
          <p className="text-ink/40 font-dm text-xs uppercase tracking-wider mb-1">Email</p>
          <p className="text-ink font-dm text-sm mb-4">{user?.email}</p>
          <p className="text-ink/40 font-dm text-xs uppercase tracking-wider mb-1">Phone Number</p>
          <p className="text-ink/35 font-dm text-[11px] mb-2">Required to generate a bank-transfer funding account.</p>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
              className="input-field-light text-sm flex-1"
              placeholder="08012345678"
              maxLength={11}
            />
            <button
              onClick={handleSavePhone}
              disabled={phoneSaving || !phone.trim() || phone === userData?.phone}
              className="btn-iris !w-auto px-4 text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {phoneSaved ? <FiCheck size={15} /> : null}
              {phoneSaving ? "Saving..." : phoneSaved ? "Saved" : "Save"}
            </button>
          </div>
          {phoneError && <p className="text-red-400 font-dm text-xs mt-2">{phoneError}</p>}
        </div>

        <div className="card-flat p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FiLock className="text-iris" size={16} />
            <h2 className="font-syne font-semibold text-ink text-sm">Transaction PIN</h2>
          </div>
          <p className="text-ink/50 font-dm text-sm mb-4">
            {userData?.hasPin
              ? "Your 4-digit PIN is required to confirm transfers, bills, and purchases."
              : "Set a 4-digit PIN — required before you can send money or make purchases."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/set-pin"
              className="text-iris hover:text-iris/80 font-dm text-sm font-medium border border-iris/25 hover:bg-iris/10 rounded-xl px-4 py-2.5"
            >
              {userData?.hasPin ? "Change PIN" : "Set PIN"}
            </Link>
            {userData?.hasPin && (
              pinResetRequested ? (
                <p className="text-ink/40 font-dm text-xs self-center">Reset request submitted — an admin will review it.</p>
              ) : (
                <button
                  onClick={handleRequestPinReset}
                  disabled={pinResetSubmitting}
                  className="flex items-center gap-1.5 text-ink/50 hover:text-ink font-dm text-sm border border-line rounded-xl px-4 py-2.5 disabled:opacity-60"
                >
                  <FiKey size={13} /> {pinResetSubmitting ? "Submitting..." : "Forgot PIN? Request Reset"}
                </button>
              )
            )}
          </div>
        </div>

        <div className="card-flat p-6 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <FiAlertTriangle className="text-red-400" size={16} />
            <h2 className="font-syne font-semibold text-ink text-sm">Danger Zone</h2>
          </div>

          {submitted ? (
            <p className="text-ink/50 font-dm text-sm">
              Your deletion request has been submitted. Our team will review it — this doesn't happen automatically.
            </p>
          ) : confirming ? (
            <div>
              <p className="text-ink/50 font-dm text-sm mb-3">
                This queues a request to permanently delete your account and all its data. An admin reviews every
                request before anything is deleted — it doesn't happen immediately.
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input-field-light min-h-[70px] resize-none text-sm mb-3"
                placeholder="Why are you leaving? (optional)"
              />
              {error && <p className="text-red-400 font-dm text-xs mb-3">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 font-dm text-sm text-ink/60 hover:text-ink border border-line rounded-xl py-2.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestDeletion}
                  disabled={submitting}
                  className="flex-1 font-dm text-sm font-medium text-red-400 border border-red-500/25 hover:bg-red-500/10 rounded-xl py-2.5 disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Confirm Request"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-ink/50 font-dm text-sm mb-4">
                Permanently delete your FanPay account and all associated data.
              </p>
              <button
                onClick={() => setConfirming(true)}
                className="text-red-400 hover:text-red-300 font-dm text-sm font-medium border border-red-500/25 hover:bg-red-500/10 rounded-xl px-4 py-2.5"
              >
                Delete My Account
              </button>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
