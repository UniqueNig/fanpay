import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import PinConfirmModal from "../components/PinConfirmModal";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { formatNaira } from "../utils/helpers";
import { FiCheckCircle, FiClock, FiAlertCircle, FiCopy, FiCheck, FiBookOpen } from "react-icons/fi";

const ResultChecker = () => {
  const { user, userData, fetchUserData } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  // JAMB only — the candidate's own JAMB Profile ID, confirmed via
  // /verify-jamb before payment, same trust pattern as electricity/cable's
  // meter/smartcard verify. WAEC has no equivalent step; a picked WAEC plan
  // goes straight to the PIN modal.
  const [profileId, setProfileId] = useState("");
  const [jambVerify, setJambVerify] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pinError, setPinError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);
  const balance = userData?.balance ?? 0;
  const isJamb = selected?.serviceID === "jamb";

  useEffect(() => {
    api
      .get("/vtu/exam-plans")
      .then((res) => setPlans(res.content?.varations || []))
      .catch((err) => setError(err.message || "Could not load result checker pin prices."))
      .finally(() => setPlansLoading(false));
  }, []);

  // Debounced (waits for typing to pause) and guards against stale
  // responses — same pattern as Bills.jsx's meter/smartcard verify.
  useEffect(() => {
    if (!isJamb || profileId.length < 8) {
      setJambVerify(null);
      setVerifyLoading(false);
      return;
    }
    let cancelled = false;
    setVerifyLoading(true);
    setJambVerify(null);
    const t = setTimeout(() => {
      api
        .get(`/vtu/verify-jamb/${profileId}?type=${selected.variation_code}`)
        .then((res) => { if (!cancelled && res.customerName) setJambVerify(res); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setVerifyLoading(false); });
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [isJamb, profileId, selected]);

  const handlePick = (plan) => {
    setError("");
    const price = parseFloat(plan.variation_amount);
    if (price > balance) {
      setError("Insufficient balance. Please deposit more funds.");
      return;
    }
    if (!userData?.hasPin) {
      navigate("/set-pin", { state: { returnTo: "/result-checker" } });
      return;
    }
    setSelected(plan);
    setProfileId("");
    setJambVerify(null);
    setPinError("");
    // JAMB needs the Profile ID entered and verified first — shown inline
    // below the plan list rather than jumping straight to the PIN modal.
    if (plan.serviceID !== "jamb") setShowPinModal(true);
  };

  const handleJambContinue = () => {
    if (!jambVerify?.customerName) {
      setError("Could not verify this JAMB Profile ID. Check it and try again.");
      return;
    }
    setError("");
    setPinError("");
    setShowPinModal(true);
  };

  const handlePinConfirm = async (pin) => {
    setLoading(true);
    setPinError("");
    try {
      const result = await api.post("/vtu/exam", {
        serviceID: selected.serviceID,
        variationCode: selected.variation_code,
        profileId: isJamb ? profileId : undefined,
        accountName: isJamb ? jambVerify?.customerName : undefined,
        pin,
      });
      await fetchUserData(user.uid);
      setSuccessData(result);
      setShowPinModal(false);
      setSuccess(true);
    } catch (err) {
      setPinError(
        err.message?.includes("Insufficient")
          ? "Insufficient balance. Please deposit more funds."
          : err.message || "Purchase failed. Please try again."
      );
    }
    setLoading(false);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const reset = () => {
    setSuccess(false);
    setSuccessData(null);
    setSelected(null);
    setProfileId("");
    setJambVerify(null);
    setError("");
  };

  const isPending = successData?.status === "pending";

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-2xl">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-ink text-2xl">Result Checker & JAMB PINs</h1>
          <p className="text-ink/40 font-dm text-sm mt-1">WAEC result checker and JAMB UTME PINs — charged from your wallet</p>
        </div>

        {success ? (
          <div className="card-flat p-10 flex flex-col items-center text-center gap-5">
            {isPending ? (
              <div className="w-20 h-20 rounded-full bg-yellow-400/15 border-2 border-yellow-400/30 flex items-center justify-center">
                <FiClock size={36} className="text-yellow-500" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-iris/15 border-2 border-iris/30 flex items-center justify-center">
                <FiCheckCircle size={36} className="text-iris" />
              </div>
            )}
            <div>
              <h2 className="font-syne font-bold text-ink text-xl mb-2">
                {isPending ? "Processing" : "Pin Purchased!"}
              </h2>
              <p className="text-ink/60 font-dm text-sm">
                <span className="text-iris font-bold">{formatNaira(successData?.amountCharged || 0)}</span>{" "}
                {isPending ? "is being processed for" : "paid for"} {selected?.name}
              </p>
              {isPending && (
                <p className="text-ink/40 font-dm text-xs mt-2">
                  This can take a few minutes to confirm. Check Transactions for your PIN once it's ready.
                </p>
              )}
            </div>

            {successData?.pin && (
              <div className="w-full bg-iris/10 border border-iris/20 rounded-xl px-4 py-3">
                <p className="text-ink/50 font-dm text-xs mb-1">Your PIN</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-iris font-syne font-bold text-lg tracking-widest">{successData.pin}</p>
                  <button onClick={() => handleCopy(successData.pin)} className="text-iris/70 hover:text-iris shrink-0">
                    {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
                  </button>
                </div>
                {successData.serialNumber && (
                  <p className="text-ink/35 font-dm text-xs mt-1">Serial: {successData.serialNumber}</p>
                )}
              </div>
            )}
            {!successData?.pin && !isPending && successData?.apiResponse && (
              <div className="w-full bg-surface border border-line rounded-xl px-4 py-3">
                <p className="text-ink/50 font-dm text-xs mb-1">Provider Response</p>
                <p className="text-ink font-dm text-sm">{successData.apiResponse}</p>
              </div>
            )}

            <div className="w-full bg-surface border border-line rounded-2xl px-5 py-4 flex justify-between">
              <span className="text-ink/50 font-dm text-sm">Remaining Balance</span>
              <span className="text-ink font-syne font-bold">{formatNaira(userData?.balance ?? 0)}</span>
            </div>
            <button onClick={reset} className="btn-iris w-full">Buy Another Pin</button>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
                <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
                <p className="text-red-400 font-dm text-sm">{error}</p>
              </div>
            )}

            {plansLoading ? (
              <div className="flex flex-col gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="card-flat p-5 h-20 animate-pulse" />
                ))}
              </div>
            ) : plans.length === 0 ? (
              <div className="card-flat p-10 text-center text-ink/35 font-dm text-sm">
                No result checker pins available right now.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {plans.map((p) => (
                  <button
                    key={p.variation_code}
                    onClick={() => handlePick(p)}
                    className={`card-flat p-5 flex items-center gap-4 text-left hover:border-iris/40 transition-colors ${
                      selected?.variation_code === p.variation_code ? "border-iris/40" : ""
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-iris/10 flex items-center justify-center shrink-0">
                      <FiBookOpen size={18} className="text-iris" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-ink font-dm text-sm font-semibold">{p.name}</p>
                      <p className="text-ink/35 font-dm text-xs">
                        {p.serviceID === "jamb" ? "Requires your JAMB Profile ID" : "Delivered to your account"}
                      </p>
                    </div>
                    <p className="text-iris font-syne font-bold shrink-0">{formatNaira(parseFloat(p.variation_amount))}</p>
                  </button>
                ))}
              </div>
            )}

            {isJamb && (
              <div className="card-flat p-5 mt-3">
                <label className="text-ink/80 font-dm text-sm font-medium mb-2 block">JAMB Profile ID</label>
                <input
                  type="text"
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                  className="input-field-light text-base"
                  placeholder="Enter your JAMB e-facility Profile ID"
                />
                {profileId.length >= 8 && (
                  verifyLoading ? (
                    <p className="text-ink/40 font-dm text-xs mt-2">Verifying Profile ID...</p>
                  ) : jambVerify?.customerName ? (
                    <div className="bg-iris/10 border border-iris/20 rounded-xl px-4 py-2.5 mt-2">
                      <p className="text-ink/50 font-dm text-[11px] mb-0.5">Verified Candidate</p>
                      <p className="text-iris font-syne font-semibold text-sm">{jambVerify.customerName}</p>
                    </div>
                  ) : (
                    <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-2.5 mt-2">
                      <p className="text-red-400 font-dm text-xs">Could not verify this JAMB Profile ID. Check it and try again.</p>
                    </div>
                  )
                )}
                <button
                  type="button"
                  onClick={handleJambContinue}
                  disabled={!jambVerify?.customerName}
                  className="btn-iris w-full mt-4 disabled:opacity-60"
                >
                  Continue to Pay
                </button>
              </div>
            )}
          </>
        )}

        {showPinModal && (
          <PinConfirmModal
            title="Confirm Purchase"
            amount={parseFloat(selected?.variation_amount || 0)}
            balance={balance}
            summary={[
              { label: "Exam", value: selected?.name },
              isJamb ? { label: "Profile ID", value: profileId } : null,
              isJamb ? { label: "Candidate", value: jambVerify?.customerName } : null,
            ].filter(Boolean)}
            onConfirm={handlePinConfirm}
            onClose={() => { setShowPinModal(false); setPinError(""); }}
            submitting={loading}
            error={pinError}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ResultChecker;
