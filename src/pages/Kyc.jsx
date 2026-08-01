import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { api } from "../api";
import { auth } from "../firebase";
import { useToast } from "../context/ToastContext";
import { FiShield, FiCheckCircle, FiAlertCircle, FiUpload, FiClock, FiXCircle } from "react-icons/fi";

// NIN only — offering BVN/Driver's License/Passport too just added friction
// for most users without adding much real coverage (product decision).
const ID_TYPE = "NIN";
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/+$/, "");

const Kyc = () => {
  const { showToast } = useToast();
  const [statusLoading, setStatusLoading] = useState(true);
  const [kyc, setKyc] = useState(null); // { status, idType, note, submittedAt, reviewedAt } | null
  const [resubmitting, setResubmitting] = useState(false);

  const [idNumber, setIdNumber] = useState("");
  const [idImage, setIdImage] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/kyc/status")
      .then((res) => setKyc(res.status ? res : null))
      .catch(() => setKyc(null))
      .finally(() => setStatusLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!idNumber.trim() || !idImage || !selfie) {
      setError("Fill in your ID number and attach both photos.");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Login required.");
      const idToken = await user.getIdToken();

      const formData = new FormData();
      formData.append("idType", ID_TYPE);
      formData.append("idNumber", idNumber.trim());
      formData.append("idImage", idImage);
      formData.append("selfie", selfie);

      // Multipart upload — bypasses api.js's JSON-only request() helper.
      const res = await fetch(`${API_URL}/api/kyc/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Submission failed. Try again.");

      setKyc({ status: "pending", idType: ID_TYPE, note: null, submittedAt: new Date().toISOString(), reviewedAt: null });
      setResubmitting(false);
      showToast("Documents submitted for review.", "success");
    } catch (err) {
      const msg = err.message || "Submission failed. Try again.";
      setError(msg);
      showToast(msg, "error");
    }
    setLoading(false);
  };

  const showForm = !statusLoading && (!kyc || resubmitting);

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-lg">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-ink text-2xl">Identity Verification</h1>
          <p className="text-ink/40 font-dm text-sm mt-1">Verify your identity to unlock higher transaction limits</p>
        </div>

        {statusLoading ? (
          <div className="card-flat p-10 flex items-center justify-center">
            <p className="text-ink/40 font-dm text-sm">Loading...</p>
          </div>
        ) : kyc?.status === "verified" ? (
          <div className="card-flat p-10 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-iris/15 border border-iris/20 flex items-center justify-center">
              <FiCheckCircle size={28} className="text-iris" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-ink text-lg mb-1">Identity Verified</h2>
              <p className="text-ink/50 font-dm text-sm">
                Your {kyc.idType} has been verified. You're all set.
              </p>
            </div>
          </div>
        ) : kyc?.status === "pending" ? (
          <div className="card-flat p-10 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-iris/15 border border-iris/20 flex items-center justify-center">
              <FiClock size={28} className="text-iris" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-ink text-lg mb-1">Submitted for Review</h2>
              <p className="text-ink/50 font-dm text-sm">
                Our team will review your documents. This usually takes 24-48 hours.
              </p>
            </div>
          </div>
        ) : kyc?.status === "rejected" && !resubmitting ? (
          <div className="card-flat p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center">
              <FiXCircle size={28} className="text-red-400" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-ink text-lg mb-1">Verification Rejected</h2>
              <p className="text-ink/50 font-dm text-sm mb-3">
                {kyc.note || "Your submission couldn't be verified."}
              </p>
              <p className="text-ink/35 font-dm text-xs">Please review the reason above and resubmit.</p>
            </div>
            <button onClick={() => setResubmitting(true)} className="btn-iris w-full">
              Resubmit Documents
            </button>
          </div>
        ) : null}

        {showForm && (
          <div className="card-flat p-6">
            <div className="flex items-center gap-2 mb-5 text-ink/50 font-dm text-xs">
              <FiShield size={14} /> Your documents are stored securely and only visible to our compliance team.
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-4">
                <FiAlertCircle size={15} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400 font-dm text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-ink/80 font-dm text-sm font-medium mb-2 block">ID Number (NIN)</label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="input-field-light text-base"
                  placeholder="Enter your 11-digit NIN"
                  required
                />
              </div>

              <div>
                <label className="text-ink/80 font-dm text-sm font-medium mb-2 block">ID Photo</label>
                <label className="flex items-center gap-2 input-field-light text-base cursor-pointer text-ink/60">
                  <FiUpload size={15} />
                  {idImage ? idImage.name : "Choose a clear photo of your ID"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setIdImage(e.target.files?.[0] || null)}
                    className="hidden"
                    required
                  />
                </label>
              </div>

              <div>
                <label className="text-ink/80 font-dm text-sm font-medium mb-2 block">Selfie</label>
                <label className="flex items-center gap-2 input-field-light text-base cursor-pointer text-ink/60">
                  <FiUpload size={15} />
                  {selfie ? selfie.name : "Choose a clear selfie"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelfie(e.target.files?.[0] || null)}
                    className="hidden"
                    required
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-iris mt-2 flex items-center justify-center gap-2 py-4 text-base disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit for Verification"}
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Kyc;
