import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import Skeleton from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { usePaystack } from "../hooks/usePaystack";
import { api } from "../api";
import { formatNaira } from "../utils/helpers";
import { FiPlusCircle, FiCheckCircle, FiZap, FiAlertCircle, FiCopy, FiCheck } from "react-icons/fi";
import { Link } from "react-router-dom";

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

const Deposit = () => {
  const { user, userData, fetchUserData } = useAuth();
  const { initializePayment } = usePaystack();
  const [method, setMethod] = useState("paystack"); // "paystack" | "transfer"
  const [amount, setAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [depositedAmount, setDepositedAmount] = useState(0);
  const [error, setError] = useState("");
  const [virtualAccounts, setVirtualAccounts] = useState(null);
  const [vaLoading, setVaLoading] = useState(true);
  const [vaError, setVaError] = useState("");
  const [copiedBank, setCopiedBank] = useState(null);
  const [pricing, setPricing] = useState(null);
  const balance = userData?.balance ?? 0;

  // Fetched once regardless of which tab is active, so switching to
  // "Bank Transfer" doesn't show its own separate loading flash.
  useEffect(() => {
    api.get("/deposits/virtual-accounts")
      .then((res) => setVirtualAccounts(res.virtualAccounts))
      .catch((err) => setVaError(err.message || "Could not load funding accounts."))
      .finally(() => setVaLoading(false));
  }, []);

  useEffect(() => {
    api.get("/pricing").then((res) => setPricing(res.pricing)).catch(() => {});
  }, []);

  const handleCopy = (accountNumber, bank) => {
    navigator.clipboard.writeText(accountNumber);
    setCopiedBank(bank);
    setTimeout(() => setCopiedBank(null), 1500);
  };

  const finalAmount = selectedPreset || parseFloat(amount) || 0;
  // Paystack takes a cut of every card/bank charge — surcharged on top here
  // (customer pays amount+fee) rather than absorbed, so the wallet still
  // gets credited exactly what was requested. Rate is admin-editable
  // (Settings → Pricing → "Paystack Deposit Fee") — see routes/deposits.js's
  // /verify for the matching server-side math that derives the same net
  // amount back out of what Paystack actually confirms was charged.
  const paystackFeePercent = pricing?.paystackDepositFeePercent || 0;
  const paystackFee = Math.round(finalAmount * (paystackFeePercent / 100) * 100) / 100;
  const chargeAmount = finalAmount + paystackFee;

  const handlePreset = (val) => { setSelectedPreset(val); setAmount(""); };
  const handleCustomAmount = (val) => { setAmount(val); setSelectedPreset(null); };

  const handleDeposit = (e) => {
    e.preventDefault();
    setError("");
    if (!finalAmount || finalAmount < 100) return;
    setLoading(true);

    initializePayment({
      email: user?.email,
      amount: chargeAmount,
      metadata: [
        { display_name: "Transaction Type", variable_name: "type", value: "wallet_deposit" },
        { display_name: "User ID", variable_name: "uid", value: user?.uid },
      ],
      onSuccess: async (res) => {
        try {
          // ✅ Server-side verification — never trust the client callback alone
          await api.post("/deposits/verify", { reference: res.reference });

          // Refresh local state from Firestore after server credits wallet
          await fetchUserData(user.uid);
          setDepositedAmount(finalAmount);
          setSuccess(true);
        } catch (err) {
          console.error("Verification failed:", err);
          setError(
            err.message?.includes("already")
              ? "This payment was already recorded."
              : "Payment received but verification failed. Contact support with ref: " + res.reference
          );
        }
        setLoading(false);
      },
      onClose: () => { setLoading(false); },
    });
  };

  const reset = () => {
    setSuccess(false); setAmount(""); setSelectedPreset(null);
    setDepositedAmount(0); setError("");
  };

  return (
    <DashboardLayout>
      <div className="p-5 lg:p-8 max-w-lg">
        <div className="mb-7">
          <h1 className="font-syne font-bold text-ink text-2xl">Deposit Money</h1>
          <p className="text-ink/40 font-dm text-sm mt-1">Add funds to your FanFi wallet</p>
        </div>

        {success ? (
          <div className="card-flat p-10 flex flex-col items-center text-center gap-5">
            <div className="w-20 h-20 rounded-full bg-iris/15 border-2 border-iris/30 flex items-center justify-center">
              <FiCheckCircle size={36} className="text-iris" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-ink text-xl mb-2">Deposit Successful!</h2>
              <p className="text-ink/60 font-dm text-sm">
                <span className="text-iris font-bold">{formatNaira(depositedAmount)}</span> added to your wallet
              </p>
            </div>
            <div className="w-full bg-iris/8 border border-iris/15 rounded-2xl px-6 py-4 flex items-center justify-between">
              <span className="text-ink/50 font-dm text-sm">New Balance</span>
              <span className="text-iris font-syne font-bold text-lg">{formatNaira(userData?.balance ?? 0)}</span>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={reset} className="btn-outline-iris flex-1">Deposit Again</button>
              <a href="/dashboard" className="btn-iris flex-1 text-center">Go to Dashboard</a>
            </div>
          </div>
        ) : (
          <div className="card-flat p-6">
            <div className="bg-iris/8 border border-iris/20 rounded-2xl px-5 py-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-ink/50 font-dm text-xs uppercase tracking-wider mb-1">Current Balance</p>
                <p className="text-ink font-syne font-bold text-xl">{formatNaira(balance)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-iris/15 flex items-center justify-center">
                <FiZap size={18} className="text-iris" />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-4">
                <FiAlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 font-dm text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-2 mb-6">
              {[["paystack", "Card / Bank"], ["transfer", "Bank Transfer"]].map(([m, label]) => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={`flex-1 py-2.5 rounded-xl font-dm text-sm font-semibold border transition-colors ${
                    method === m ? "bg-iris/15 text-iris border-iris/30" : "text-ink/50 border-line hover:text-ink"
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {method === "transfer" ? (
              <div className="flex flex-col gap-3">
                {vaLoading ? (
                  <>
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                  </>
                ) : vaError ? (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                    <FiAlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400 font-dm text-sm">
                      {vaError}{" "}
                      {vaError.includes("phone") && (
                        <Link to="/settings" className="text-iris hover:underline">Update in Settings →</Link>
                      )}
                    </p>
                  </div>
                ) : (
                  [["paga", virtualAccounts?.paga], ["palmpay", virtualAccounts?.palmpay]].map(
                    ([bank, acc]) =>
                      acc?.accountNumber && (
                        <button key={bank} type="button" onClick={() => handleCopy(acc.accountNumber, bank)}
                          className="flex items-center justify-between bg-surface border border-line rounded-2xl px-5 py-4 hover:bg-line transition-colors text-left">
                          <div>
                            <p className="text-ink/40 font-dm text-[11px] uppercase tracking-wider mb-1">{acc.bankName}</p>
                            <p className="text-ink font-syne font-bold text-lg tracking-wide">{acc.accountNumber}</p>
                            <p className="text-ink/40 font-dm text-xs mt-0.5">{acc.accountName}</p>
                          </div>
                          {copiedBank === bank ? <FiCheck size={18} className="text-iris shrink-0" /> : <FiCopy size={18} className="text-ink/40 shrink-0" />}
                        </button>
                      )
                  )
                )}
                <p className="text-ink/30 font-dm text-xs text-center mt-1">
                  Transfer any amount to either account, any time — credited automatically, usually within a few minutes.
                </p>
              </div>
            ) : (
            <form onSubmit={handleDeposit} className="flex flex-col gap-5">
              <div>
                <label className="text-ink/70 font-dm text-sm font-medium mb-3 block">Select Amount</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button key={amt} type="button" onClick={() => handlePreset(amt)}
                      className={`py-3 px-2 rounded-xl font-dm text-sm font-semibold border transition-all duration-200 ${
                        selectedPreset === amt
                          ? "bg-iris text-accent-ink border-iris shadow-lg shadow-iris/20"
                          : "bg-surface border-line text-ink/75 hover:bg-line hover:border-iris/30 hover:text-ink"
                      }`}>
                      ₦{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-ink/70 font-dm text-sm font-medium mb-2 block">Or enter custom amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/50 font-syne font-bold text-base">₦</span>
                  <input type="number" value={amount} onChange={(e) => handleCustomAmount(e.target.value)}
                    className="input-field-light pl-9 text-base" placeholder="Enter amount (min ₦100)" min="100" />
                </div>
              </div>

              {finalAmount >= 100 && (
                <div className="bg-surface border border-line rounded-xl px-4 py-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-ink/50 font-dm text-sm">You're depositing</span>
                    <span className="text-ink font-dm text-sm">{formatNaira(finalAmount)}</span>
                  </div>
                  {paystackFee > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-ink/50 font-dm text-sm">Paystack fee</span>
                      <span className="text-ink font-dm text-sm">{formatNaira(paystackFee)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1.5 border-t border-line">
                    <span className="text-ink/70 font-dm text-sm font-medium">Total to pay</span>
                    <span className="text-ink font-syne font-bold text-base">{formatNaira(chargeAmount)}</span>
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading || finalAmount < 100}
                className="btn-iris flex items-center justify-center gap-2 text-base py-4 disabled:opacity-50 disabled:cursor-not-allowed">
                <FiPlusCircle size={16} />
                {loading ? "Verifying payment..." : `Pay ${chargeAmount >= 100 ? formatNaira(chargeAmount) : ""} via Paystack`}
              </button>
              <p className="text-ink/30 font-dm text-xs text-center">
                Secured by Paystack · Verified server-side before crediting
              </p>
            </form>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Deposit;
